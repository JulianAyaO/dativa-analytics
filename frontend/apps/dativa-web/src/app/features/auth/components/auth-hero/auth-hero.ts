import { Component, input } from '@angular/core';

@Component({
  selector: 'dtv-auth-hero',
  templateUrl: './auth-hero.html',
  styleUrl: './auth-hero.scss',
})
export class AuthHero {
  readonly headline = input.required<string>();
  readonly lead = input.required<string>();
}
