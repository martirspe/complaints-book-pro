import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-complaints-book-skeleton',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <!-- Header Skeleton -->
    <header class="relative overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm mb-6">
      <!-- Decorative accent -->
      <div class="absolute inset-x-0 top-0 h-0.5 bg-gray-300 animate-pulse"></div>

      <div class="p-8">
        <!-- Logo and Content Layout -->
        <div class="flex flex-col md:flex-row gap-4 items-center md:items-start">
          <!-- Logo Column -->
          <div class="w-24 h-24 md:w-28 md:h-28 rounded-xl border border-gray-200 bg-gray-200 shrink-0 animate-pulse"></div>

          <!-- Content Column -->
          <div class="flex-1 min-w-0 w-full">
            <!-- Title Section -->
            <div class="mb-6 text-center md:text-left">
              <div class="h-7 bg-gray-300 rounded-lg w-3/4 mb-2 animate-pulse mx-auto md:mx-0"></div>
            </div>

            <!-- Company Info - Compact Grid aligned to current header -->
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
              <div class="flex items-start gap-3 p-2">
                <div class="w-5 h-5 rounded-full bg-gray-200 animate-pulse"></div>
                <div class="flex-1 space-y-2">
                  <div class="h-4 bg-gray-200 rounded animate-pulse w-9/12"></div>
                  <div class="h-4 bg-gray-200 rounded animate-pulse w-6/6"></div>
                </div>
              </div>
              <div class="flex items-start gap-3 p-2">
                <div class="w-5 h-5 rounded-full bg-gray-200 animate-pulse"></div>
                <div class="flex-1 space-y-2">
                  <div class="h-4 bg-gray-200 rounded animate-pulse w-9/12"></div>
                  <div class="h-4 bg-gray-200 rounded animate-pulse w-6/6"></div>
                </div>
              </div>
              <div class="flex items-start gap-3 p-2">
                <div class="w-5 h-5 rounded-full bg-gray-200 animate-pulse"></div>
                <div class="flex-1 space-y-2">
                  <div class="h-4 bg-gray-200 rounded animate-pulse w-9/12"></div>
                  <div class="h-4 bg-gray-200 rounded animate-pulse w-6/6"></div>
                </div>
              </div>
              <div class="flex items-start gap-3 p-2">
                <div class="w-5 h-5 rounded-full bg-gray-200 animate-pulse"></div>
                <div class="flex-1 space-y-2">
                  <div class="h-4 bg-gray-200 rounded animate-pulse w-9/12"></div>
                  <div class="h-4 bg-gray-200 rounded animate-pulse w-6/6"></div>
                </div>
              </div>
              <div class="flex items-start gap-3 p-2">
                <div class="w-5 h-5 rounded-full bg-gray-200 animate-pulse"></div>
                <div class="flex-1 space-y-2">
                  <div class="h-4 bg-gray-200 rounded animate-pulse w-9/12"></div>
                  <div class="h-4 bg-gray-200 rounded animate-pulse w-6/6"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>

    <!-- Tabs Navigation Skeleton -->
    <nav class="mb-6 flex justify-center">
      <div class="flex gap-2 max-w-max rounded-xl bg-white p-1 border border-gray-200 shadow-sm">
        <div class="min-w-35 max-w-45 h-9 bg-gray-200 rounded-lg animate-pulse"></div>
        <div class="min-w-35 max-w-45 h-9 bg-gray-200 rounded-lg animate-pulse"></div>
      </div>
    </nav>

    <!-- Form Skeleton -->
    <div class="space-y-6">
      <!-- Section 1 Skeleton -->
      <section class="bg-white border border-gray-200 rounded-xl p-8 shadow-sm">
        <div class="flex items-center gap-2 mb-6">
          <div class="w-6 h-6 bg-gray-300 rounded-full animate-pulse"></div>
          <div class="h-6 bg-gray-300 rounded-lg w-64 animate-pulse"></div>
        </div>

        <div class="space-y-5">
          <!-- Tipo de Persona -->
          <div class="mb-6">
            <div class="h-4 bg-gray-200 rounded w-32 mb-3 animate-pulse"></div>
            <div class="flex gap-3">
              <div class="flex-1 h-12 bg-gray-200 rounded-lg animate-pulse"></div>
              <div class="flex-1 h-12 bg-gray-200 rounded-lg animate-pulse"></div>
            </div>
          </div>

          <!-- Tipo de Documento y Número -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <div class="h-4 bg-gray-200 rounded w-32 mb-2 animate-pulse"></div>
              <div class="h-11 bg-gray-200 rounded-lg animate-pulse"></div>
            </div>
            <div>
              <div class="h-4 bg-gray-200 rounded w-36 mb-2 animate-pulse"></div>
              <div class="h-11 bg-gray-200 rounded-lg animate-pulse"></div>
            </div>
          </div>

          <!-- Nombres y Apellidos -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <div class="h-4 bg-gray-200 rounded w-20 mb-2 animate-pulse"></div>
              <div class="h-11 bg-gray-200 rounded-lg animate-pulse"></div>
            </div>
            <div>
              <div class="h-4 bg-gray-200 rounded w-24 mb-2 animate-pulse"></div>
              <div class="h-11 bg-gray-200 rounded-lg animate-pulse"></div>
            </div>
          </div>

          <!-- Checkbox menor de edad -->
          <div class="flex items-center gap-3 p-3 rounded-lg">
            <div class="w-5 h-5 bg-gray-200 rounded animate-pulse"></div>
            <div class="h-4 bg-gray-200 rounded w-40 animate-pulse"></div>
          </div>

          <!-- Separador -->
          <div class="pt-6 mt-6 border-t border-gray-200">
            <div class="h-5 bg-gray-200 rounded w-48 mb-4 animate-pulse"></div>
          </div>

          <!-- Ubicación -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <div class="h-4 bg-gray-200 rounded w-48 mb-2 animate-pulse"></div>
              <div class="h-11 bg-gray-200 rounded-lg animate-pulse"></div>
            </div>
            <div>
              <div class="h-4 bg-gray-200 rounded w-24 mb-2 animate-pulse"></div>
              <div class="h-11 bg-gray-200 rounded-lg animate-pulse"></div>
            </div>
          </div>

          <!-- Separador -->
          <div class="pt-6 mt-6 border-t border-gray-200">
            <div class="h-5 bg-gray-200 rounded w-40 mb-6 animate-pulse"></div>
          </div>

          <!-- Email y Teléfono -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <div class="h-4 bg-gray-200 rounded w-36 mb-3 animate-pulse"></div>
              <div class="h-11 bg-gray-200 rounded-lg animate-pulse"></div>
            </div>
            <div>
              <div class="h-4 bg-gray-200 rounded w-24 mb-3 animate-pulse"></div>
              <div class="h-11 bg-gray-200 rounded-lg animate-pulse"></div>
            </div>
          </div>
        </div>
      </section>

      <!-- Section 2 Skeleton - Identificación del bien -->
      <section class="bg-white border border-gray-200 rounded-xl p-8 shadow-sm">
        <div class="flex items-center gap-2 mb-6">
          <div class="w-6 h-6 bg-gray-300 rounded-full animate-pulse"></div>
          <div class="h-6 bg-gray-300 rounded-lg w-56 animate-pulse"></div>
        </div>

        <div class="space-y-5">
          <!-- Tipo de Bien -->
          <div class="mb-6">
            <div class="h-4 bg-gray-200 rounded w-28 mb-3 animate-pulse"></div>
            <div class="flex gap-3">
              <div class="flex-1 h-12 bg-gray-200 rounded-lg animate-pulse"></div>
              <div class="flex-1 h-12 bg-gray-200 rounded-lg animate-pulse"></div>
            </div>
          </div>

          <!-- Descripción del Producto o Servicio -->
          <div>
            <div class="h-4 bg-gray-200 rounded w-56 mb-2 animate-pulse"></div>
            <div class="h-24 bg-gray-200 rounded-lg animate-pulse"></div>
            <div class="h-3 bg-gray-100 rounded w-64 mt-1 animate-pulse"></div>
          </div>

          <!-- Checkboxes -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="flex items-center gap-3 p-3 rounded-lg">
              <div class="w-5 h-5 bg-gray-200 rounded animate-pulse"></div>
              <div class="h-4 bg-gray-200 rounded w-44 animate-pulse"></div>
            </div>
            <div class="flex items-center gap-3 p-3 rounded-lg">
              <div class="w-5 h-5 bg-gray-200 rounded animate-pulse"></div>
              <div class="h-4 bg-gray-200 rounded w-52 animate-pulse"></div>
            </div>
          </div>
        </div>
      </section>

      <!-- Section 3 Skeleton - Reclamación y pedido -->
      <section class="bg-white border border-gray-200 rounded-xl p-8 shadow-sm">
        <div class="flex items-center gap-2 mb-6">
          <div class="w-6 h-6 bg-gray-300 rounded-full animate-pulse"></div>
          <div class="h-6 bg-gray-300 rounded-lg w-52 animate-pulse"></div>
        </div>

        <div class="space-y-6">
          <!-- Reclamo o Queja -->
          <div class="mb-6">
            <div class="h-4 bg-gray-200 rounded w-40 mb-3 animate-pulse"></div>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div class="h-24 bg-gray-200 rounded-lg animate-pulse"></div>
              <div class="h-24 bg-gray-200 rounded-lg animate-pulse"></div>
            </div>
          </div>

          <!-- Descripción del Reclamo -->
          <div>
            <div class="h-4 bg-gray-200 rounded w-44 mb-2 animate-pulse"></div>
            <div class="h-32 bg-gray-200 rounded-lg animate-pulse"></div>
            <div class="h-3 bg-gray-100 rounded w-72 mt-1 animate-pulse"></div>
          </div>

          <!-- Pedido / Solución Esperada -->
          <div>
            <div class="h-4 bg-gray-200 rounded w-48 mb-2 animate-pulse"></div>
            <div class="h-20 bg-gray-200 rounded-lg animate-pulse"></div>
            <div class="h-3 bg-gray-100 rounded w-64 mt-1 animate-pulse"></div>
          </div>
        </div>
      </section>

      <!-- Section 4 Skeleton - Archivos adjuntos -->
      <section class="bg-white border border-gray-200 rounded-xl p-8 shadow-sm">
        <div class="flex items-center gap-2 mb-6">
          <div class="w-6 h-6 bg-gray-300 rounded-full animate-pulse"></div>
          <div class="h-6 bg-gray-300 rounded-lg w-44 animate-pulse"></div>
        </div>

        <div class="space-y-4">
          <!-- Área de arrastrar archivos -->
          <div class="h-48 bg-gray-200 rounded-xl border-2 border-dashed border-gray-300 animate-pulse flex items-center justify-center">
            <div class="text-center">
              <div class="w-16 h-16 bg-gray-100 rounded-xl mx-auto mb-4"></div>
              <div class="h-4 bg-gray-300 rounded w-56 mx-auto mb-2"></div>
              <div class="h-3 bg-gray-200 rounded w-64 mx-auto"></div>
            </div>
          </div>
        </div>
      </section>

      <!-- Nota informativa Skeleton -->
      <aside class="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
        <div class="w-5 h-5 bg-green-200 rounded-full animate-pulse shrink-0"></div>
        <div class="flex-1 space-y-2">
          <div class="h-3 bg-green-200 rounded w-full animate-pulse"></div>
          <div class="h-3 bg-green-200 rounded w-5/6 animate-pulse"></div>
        </div>
      </aside>

      <!-- Button Skeleton -->
      <footer class="flex flex-col items-center gap-6 pt-4">
        <div class="flex items-center gap-3 p-3 rounded-lg">
          <div class="w-5 h-5 bg-gray-200 rounded animate-pulse"></div>
          <div class="h-4 bg-gray-200 rounded w-64 animate-pulse"></div>
        </div>
        <div class="h-12 w-full md:w-48 bg-gray-300 rounded-lg animate-pulse"></div>
      </footer>
    </div>
  `
})
export class ComplaintsBookSkeletonComponent { }
