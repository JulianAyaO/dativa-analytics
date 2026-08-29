import { Component, input } from '@angular/core';

@Component({
  selector: 'dtv-loading',
  templateUrl: './loading.html',
  styleUrl: './loading.scss',
})
export class Loading {
  readonly label = input('Cargando');
}
