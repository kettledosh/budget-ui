import {Component, OnInit} from '@angular/core';
import {ModalController, RefresherCustomEvent} from '@ionic/angular';
import { filter, finalize, from, mergeMap, tap } from 'rxjs';
import { CategoryModalComponent } from '../../category/category-modal/category-modal.component';
import { ActionSheetService } from '../../shared/service/action-sheet.service';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import {formatISO, getDate, parseISO} from 'date-fns';
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
    category ? this.categories.push(category) : null;
    this.expenseForm.patchValue({ id, name, amount, categoryId: category?.id, date });
    this.expenseForm.controls['date'].setValue(formatISO(new Date(), { representation: 'date' })) //Ansonsten is Date undefined :S
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
    this.expenseForm.value.categoryId ? null : delete this.expenseForm.value.categoryId //überprüft ob categoryId leer ist, wenn so das value aus dem object löschen
    this.submitting = true;
    this.expenseService
        .upsertExpense(this.expenseForm.value)
        .pipe(finalize(() => (this.submitting = false)))
        .subscribe({
          next: () => {
            this.toastService.displaySuccessToast('Expense saved');
            this.modalCtrl.dismiss(null, 'refresh');
          },
          error: (error) => this.toastService.displayErrorToast('Could not save expense', error),
        });
  }

  delete(): void {
    from(this.actionSheetService.showDeletionConfirmation('Are you sure you want to delete this expense?'))
      .pipe(
        filter((action) => action === 'delete'),
        tap(() => (this.submitting = true)),
        mergeMap(() => this.expenseService.deleteExpense(this.expense.id!)),
        finalize(() => (this.submitting = false)),
      )
      .subscribe({
        next: () => {
          this.toastService.displaySuccessToast('Expense deleted');
          this.modalCtrl.dismiss(null, 'refresh');
        },
        error: (error) => this.toastService.displayErrorToast('Could not delete category', error),
      });
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
