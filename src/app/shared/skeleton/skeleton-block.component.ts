import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-skeleton-block',
  imports: [],
  template: `<div class="skeleton" [style.width]="width" [style.height]="height" [style.border-radius]="radius"></div>`,
  styleUrls: ['./skeleton-block.component.css']
})
export class SkeletonBlockComponent {
  @Input() width: string = '100%';
  @Input() height: string = '16px';
  @Input() radius: string = '4px';
}
