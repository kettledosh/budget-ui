
import { Component, ViewChild } from '@angular/core';
import { CategoryModalComponent } from '../category-modal/category-modal.component';
import { ModalController } from '@ionic/angular';
import { Category } from '../../shared/domain';
import { IonModal } from '@ionic/angular';
import { OverlayEventDetail } from '@ionic/core/components';

@Component({
  selector: 'app-category-list',
  templateUrl: './category-list.component.html',
})
export class CategoryListComponent {
  @ViewChild(IonModal) modal: IonModal;

  name: string | undefined;
  constructor(private readonly modalCtrl: ModalController) {}
  cancel() {
    this.modal.dismiss(null, 'cancel');
  }

  confirm() {
    this.modal.dismiss(this.name, 'confirm');
  }

  onWillDismiss(event: Event) {
    const ev = event as CustomEvent<OverlayEventDetail<string>>;
    if (ev.detail.role === 'confirm') {

    }
  }
  async openModal(category?: Category): Promise<void> {
    const modal = await this.modalCtrl.create({ component: CategoryModalComponent });
    modal.present();
    const { role } = await modal.onWillDismiss();
    console.log('role', role);
  }
}
