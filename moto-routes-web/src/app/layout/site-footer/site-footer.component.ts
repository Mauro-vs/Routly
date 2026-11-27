import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

import { BrandMarkComponent } from '../../shared/ui/brand-mark/brand-mark.component';

/** El pie: la marca, qué es Routly, los mismos enlaces que la cabecera y de dónde sale el proyecto. */
@Component({
  selector: 'app-site-footer',
  imports: [RouterLink, BrandMarkComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './site-footer.component.html',
  styleUrl: './site-footer.component.css',
})
export class SiteFooterComponent {}
