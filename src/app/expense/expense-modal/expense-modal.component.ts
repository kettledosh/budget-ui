import { Component } from '@angular/core';
import {ModalController, RefresherCustomEvent} from '@ionic/angular';
import { filter, finalize, from, mergeMap, tap } from 'rxjs';
import { CategoryModalComponent } from '../../category/category-modal/category-modal.component';
import { ActionSheetService } from '../../shared/service/action-sheet.service';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { formatISO, parseISO } from 'date-fns';
import { ExpenseService } from '../expense.service';
import { ToastService } from 'src/app/shared/service/toast.service';
import { CategoryService } from '../../category/category.service';
import {Category, CategoryCriteria} from "../../shared/domain";




@Component({
  selector: 'app-expense-modal',
  templateUrl: './expense-modal.component.html',
})
export class ExpenseModalComponent {
  categories: Category[] = [];
  readonly expenseForm: FormGroup;
  submitting = false;
  readonly initialSort = 'name,asc';
  lastPageReached = false;
  loading = false;
  searchCriteria: CategoryCriteria = { page: 0, size: 25, sort: this.initialSort };
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
      date: "",
      name: ['', [Validators.required, Validators.maxLength(40)]],
    });
  }

  ionViewWillEnter(): void {
    this.loadCategories();
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
    this.submitting = true;
    this.expenseService
    console.log(this.expenseForm.value)
    //Assuming 'expenseService' and 'expenseForm' are properly declared and initialized
    this.expenseService.upsertExpense({
      ...this.expenseForm.value,
      date: formatISO(parseISO(this.expenseForm.value.date), { representation: 'date' }),
    });
    this.modalCtrl.dismiss(null, 'save');
  }

  delete(): void {
    from(this.actionSheetService.showDeletionConfirmation('Are you sure you want to delete this expense?'))
      .pipe(filter((action) => action === 'delete'))
      .subscribe(() => this.modalCtrl.dismiss(null, 'delete'));
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
