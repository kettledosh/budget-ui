import {Component, OnInit} from '@angular/core';
import {ModalController, RefresherCustomEvent} from '@ionic/angular';
import { filter, finalize, from, mergeMap, tap } from 'rxjs';
import { CategoryModalComponent } from '../../category/category-modal/category-modal.component';
import { ActionSheetService } from '../../shared/service/action-sheet.service';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { formatISO, parseISO } from 'date-fns';
import { ExpenseService } from '../expense.service';
import { ToastService } from 'src/app/shared/service/toast.service';
import { CategoryService } from '../../category/category.service';
import {Category, CategoryCriteria, Expense} from "../../shared/domain";

@Component({
  selector: 'app-expense-modal',
  templateUrl: './expense-modal.component.html',
})
export class ExpenseModalComponent{
  categories: Category[] = [];
  readonly expenseForm: FormGroup;
  submitting = false;
  readonly initialSort = 'name,asc';
  lastPageReached = false;
  loading = false;
  searchCriteria: CategoryCriteria = { page: 0, size: 25, sort: this.initialSort};
  expense: Expense = {} as Expense;
  category: Category = {} as Category;

  constructor(
      private readonly actionSheetService: ActionSheetService,
      private readonly modalCtrl: ModalController,
      private readonly toastService: ToastService,
      private readonly categoryService: CategoryService,
      private readonly expenseService: ExpenseService,
      private readonly formBuilder: FormBuilder,
  ) {
    this.expenseForm = this.formBuilder.group({
      id: [], // hidden
      amount: [null, [Validators.required, Validators.min(0.01)]],
      categoryId: "",
      date: [formatISO(new Date())],
      name: ['', [Validators.required, Validators.maxLength(40)]],
    });
  }

  ionViewWillEnter(): void {
    this.loadCategories();
    const { id, amount, category, date, name } = this.expense;
    if (category) this.categories.push(category);
    this.expenseForm.patchValue({ id, name, amount, categoryId: category?.id, date });
  }

  private loadCategories(next: () => void = () => {}): void {
    if (!this.searchCriteria.name) delete this.searchCriteria.name;
    this.loading = true;
    this.categoryService
        .getCategories(this.searchCriteria)
        .pipe(
            finalize(() => {
              this.loading = false;
              next();
            }),
        )
        .subscribe({
          next: (categories) => {
            if (this.searchCriteria.page === 0 || !this.categories) this.categories = [];
            this.categories.push(...categories.content);
            this.lastPageReached = categories.last;
          },
          error: (error) => this.toastService.displayErrorToast('Could not load categories', error),
        });
  }

  cancel(): void {
    this.modalCtrl.dismiss(null, 'cancel');
  }

  save(): void {
    const expenseData = {
      ...this.expenseForm.value, // Kopiert alle Werte aus expenseForm.value
      date: formatISO(parseISO(this.expenseForm.value.date), { representation: 'date' }),
    };
    console.log(this.expenseForm.value)
    this.submitting = true;
    this.expenseService
        .upsertExpense(expenseData)
        .pipe(finalize(() => (this.submitting = false)))
        .subscribe({
          next: () => {
            this.toastService.displaySuccessToast('Expense saved');
            this.modalCtrl.dismiss(null, 'refresh');
          },
          error: (error) => this.toastService.displayErrorToast('Could not save expense', error),
        });
    this.modalCtrl.dismiss(null, 'save');

    this.expenseService.upsertExpense({
      ...this.expenseForm.value,
      date: formatISO(parseISO(this.expenseForm.value.date), { representation: 'date' }),
    });
    this.modalCtrl.dismiss(null, 'save');
  }



  /*  save(): void {
      // Set submitting to true to indicate that the save operation is in progress
      this.submitting = true;

      // Call the upsertExpense method from the expenseService with the form value
      this.expenseService
        .upsertExpense(this.expenseForm.value)
        .pipe(
          // Use finalize to execute code after the observable completes or errors
          finalize(() => (this.submitting = false))
        )
        .subscribe({
          // Handle the successful response
          next: () => {
            // Display a success toast
            this.toastService.displaySuccessToast('Expense saved');

            // Dismiss the modal with a 'refresh' signal
            this.modalCtrl.dismiss(null, 'refresh');
          },
          // Handle errors during the subscription
          error: (error) =>
            this.toastService.displayErrorToast('Could not save expense', error),
        });

      // Dismiss the modal with a 'save' signal
      this.modalCtrl.dismiss(null, 'save');

      // Modify the date field before calling upsertExpense again
      this.expenseService.upsertExpense({
        ...this.expenseForm.value,
        date: formatISO(parseISO(this.expenseForm.value.date), {
          representation: 'date',
        }),
      });

      // Dismiss the modal with a 'save' signal again (duplicate line)
      this.modalCtrl.dismiss(null, 'save');
    }
  */


  delete(): void {
    from(this.actionSheetService.showDeletionConfirmation('Are you sure you want to delete this expense?'))
        .pipe(
            filter((action) => action === 'delete'))

        .subscribe(
            () => this.modalCtrl.dismiss(null, 'delete'));
  }

  async showCategoryModal(): Promise<void> {
    const categoryModal = await this.modalCtrl.create({ component: CategoryModalComponent });
    categoryModal.present();
    const { role } = await categoryModal.onWillDismiss();
    console.log('role', role);
  }

  async openModal(category?: Category): Promise<void> {
    const modal = await this.modalCtrl.create({
      component: CategoryModalComponent,
      componentProps: { category: category ? { ...category } : {} },
    });
    modal.present();
    const { role } = await modal.onWillDismiss();
    if (role === 'refresh') this.reloadCategories();
  }

  reloadCategories($event?: any): void {
    this.searchCriteria.page = 0;
    this.loadCategories(() => ($event ? ($event as RefresherCustomEvent).target.complete() : {}));
  }

}
