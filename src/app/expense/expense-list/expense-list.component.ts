import { Component } from '@angular/core';
import { addMonths, set } from 'date-fns';
import {InfiniteScrollCustomEvent, ModalController, RefresherCustomEvent} from '@ionic/angular';
import { ExpenseModalComponent } from '../expense-modal/expense-modal.component';
import {Category, CategoryCriteria, Expense, SortOption} from '../../shared/domain';
import {CategoryService} from "../../category/category.service";
import {ExpenseService} from "../expense.service";
import {FormBuilder, FormGroup} from "@angular/forms";
import {ToastService} from "../../shared/service/toast.service";
import {debounce, finalize, interval, Subscription} from "rxjs";

@Component({
  selector: 'app-expense-overview',
  templateUrl: './expense-list.component.html',
})
export class ExpenseListComponent {
  date = set(new Date(), { date: 1 });
  categories: Category[] = [];
  expenses: Expense[] = [];


  private readonly searchFormSubscription: Subscription;
  readonly searchForm: FormGroup;
  readonly sortOptions: SortOption[] = [
    { label: 'Created at (newest first)', value: 'createdAt,desc' },
    { label: 'Created at (oldest first)', value: 'createdAt,asc' },
    { label: 'Date (newest first)', value: 'createdAt,desc' },
    { label: 'Date at (oldest first)', value: 'createdAt,asc' },
    { label: 'Name (A-Z)', value: 'name,asc' },
    { label: 'Name (Z-A)', value: 'name,desc' },
  ];
  constructor(private readonly modalCtrl: ModalController,
              private readonly categoryService: CategoryService,
              private readonly toastService: ToastService,
              private readonly formBuilder: FormBuilder,
              private readonly expenseService: ExpenseService
              )  { this.searchForm = this.formBuilder.group({ name: [], sort: [this.initialSort] });
    this.searchFormSubscription = this.searchForm.valueChanges
        .pipe(debounce((value) => interval(value.name?.length ? 400 : 0)))
        .subscribe((value) => {
          this.searchCriteria = { ...this.searchCriteria, ...value, page: 0 };
          this.loadExpenses();
        });
  }

  addMonths = (number: number): void => {
    this.date = addMonths(this.date, number);
  };
  ionViewWillEnter(): void {
    this.loadAllCategories();
    this.loadExpenses();
  }
  private loadAllCategories(): void {
    this.categoryService.getAllCategories({ sort: 'name,asc' }).subscribe({
      next: (categories) => (this.categories = categories),
      error: (error) => this.toastService.displayErrorToast('Could not load categories', error),
    });
  }
  readonly initialSort = 'name,asc';
  searchCriteria: CategoryCriteria = { page: 0, size: 25, sort: this.initialSort };
  loading = false;
  lastPageReached = false;


  private loadExpenses(next: () => void = () => {}): void {
    if (!this.searchCriteria.name) delete this.searchCriteria.name;
    this.loading = true;
    this.expenseService
        .getExpenses(this.searchCriteria)
        .pipe(
            finalize(() => {
              this.loading = false;
              next();
            }),
        )
        .subscribe({
          next: (categories) => {
            if (this.searchCriteria.page === 0 || !this.expenses) this.expenses = [];
            this.expenses.push(...categories.content);
            this.lastPageReached = categories.last;
          },
          error: (error) => this.toastService.displayErrorToast('Could not load categories', error),
        });
  }
  loadNextExpensePage($event: any) {
    this.searchCriteria.page++;
    this.loadExpenses(() => ($event as InfiniteScrollCustomEvent).target.complete());
  }
  reloadExpenses($event?: any): void {
    this.searchCriteria.page = 0;
    this.loadExpenses(() => ($event ? ($event as RefresherCustomEvent).target.complete() : {}));
  }

  async openModal(expense?: Expense): Promise<void> {
    const modal = await this.modalCtrl.create({
      component: ExpenseModalComponent,
      componentProps: { expense: expense ? { ...expense } : {} },
    });
    modal.present();
    const { role } = await modal.onWillDismiss();
    console.log('role', role);
  }
}
