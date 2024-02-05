import { Component } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { ActionSheetService } from '../../shared/service/action-sheet.service';
import {filter, finalize, from, mergeMap, tap} from 'rxjs';
import {FormBuilder, FormGroup, Validators} from "@angular/forms";
import {ToastService} from "../../shared/service/toast.service";
import {CategoryService} from "../category.service";
import {Category} from "../../shared/domain";

@Component({
  selector: 'app-category-modal',
  templateUrl: './category-modal.component.html',
})

export class CategoryModalComponent {
  // Passed into the component by the ModalController, available in the ionViewWillEnter
  category: Category = {} as Category;
  constructor(
    private readonly actionSheetService: ActionSheetService,
    private readonly categoryService: CategoryService,
    private readonly formBuilder: FormBuilder,
    private readonly modalCtrl: ModalController,
    private readonly toastService: ToastService,

  ) {
    this.categoryForm = this.formBuilder.group({
      id: [], //hidden
      name: ['', [Validators.required, Validators.maxLength(40)]],


  });
  }
  readonly categoryForm: FormGroup;
  submitting = false;

  ionViewWillEnter(): void {
    this.categoryForm.patchValue(this.category);
  }

  cancel(): void {
    this.modalCtrl.dismiss(null, 'cancel');
  }

  save(): void {
        this.submitting = true;
    this.categoryService
      .upsertCategory(this.categoryForm.value)
      .pipe(finalize(() => (this.submitting = false)))
      .subscribe({
        next: () => {
          this.toastService.displaySuccessToast('Category saved');
          this.modalCtrl.dismiss(null, 'refresh');
        },
        error: (error) => this.toastService.displayErrorToast('Could not save category', error),
      });
    //this.modalCtrl.dismiss(null, 'save');
  }

  delete(): void {
    from(this.actionSheetService.showDeletionConfirmation('Are you sure you want to delete this category?'))
      .pipe(
        filter((action) => action === 'delete'),
        tap(() => (this.submitting = true)),
        mergeMap(() => this.categoryService.deleteCategory(this.category.id!)),
        finalize(() => (this.submitting = false)),
      )
      .subscribe({
        next: () => {
          this.toastService.displaySuccessToast('Category deleted');
          this.modalCtrl.dismiss(null, 'refresh');
        },
        error: (error) => this.toastService.displayErrorToast('Could not delete category', error),
      });
  }
}

/*
rsetze den Methodennamen ionViewWillEnter mit ionViewDidEnter.
Öffne eine bestehende Kategorie.
Welches Verhalten beobachtest du im Vergleich zur originalen Lösung und warum?
Für mehr Infos schaue auch in die Doku.
Füllt die Daten erst nach dem Laden ein. Somit ist der Name zuerst leer

ionViewWillEnter
Fired when the component routing to is about to animate into view.

ionViewDidEnter
Fired when the component routing to has finished animating.


Füge console.log(this.categoryForm.value); oben in die save Methode ein.
Erstelle und bearbeite (und speichere) eine Kategorie.
Schaue auf die Entwicklerkonsole, was wird geloggt?

Beim Erstellen der Kategorie ist die ID null, erst beim Bearbeiten ist eine ID vorhanden





Ersetze this.modalCtrl.dismiss(null, 'refresh'); mit this.modalCtrl.dismiss(null, 'reload');.
Lösche eine Kategorie.
Was passiert mit der Kategorie in der Liste und warum?

Die Kategorie bleibt in der Liste und ist erst nach einem Relod der Page weg.
*/
