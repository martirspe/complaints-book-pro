import { Component, OnInit } from '@angular/core';
import { BrandingService } from './services/branding.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html'
})
export class AppComponent implements OnInit {
  title = 'complaints-book-client';

  constructor(private brandingService: BrandingService) {}

  ngOnInit(): void {
    this.brandingService.getBranding().subscribe({
      next: (branding) => {
        this.brandingService.applyTheme(branding);
        if (branding?.companyBrand) {
          document.title = `${branding.companyBrand} | Libro de Reclamaciones`;
        }
      },
      error: () => {
        // Fail gracefully: keep defaults
      }
    });
  }
}
