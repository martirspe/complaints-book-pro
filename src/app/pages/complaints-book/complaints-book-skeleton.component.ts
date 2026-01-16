import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-complaints-book-skeleton',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <!-- Header Skeleton -->
    <header class="relative bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden mb-6">
      <!-- Decorative accent -->
      <div class="absolute top-0 left-0 right-0 h-0.5 bg-gray-200 animate-pulse"></div>

      <div class="p-8">
        <!-- Logo and Content Layout -->
        <div class="flex flex-col md:flex-row gap-6 items-center">
          <!-- Logo Column -->
          <div class="w-24 h-24 md:w-28 md:h-28 rounded-xl border border-gray-200 bg-gray-200 shrink-0 animate-pulse"></div>

          <!-- Content Column -->
          <div class="flex-1 min-w-0 w-full">
            <!-- Title Section -->
            <div class="mb-4 text-center md:text-left">
              <div class="h-7 bg-gray-300 rounded-lg w-3/4 mb-2 animate-pulse"></div>
              <div class="h-4 bg-gray-200 rounded-lg w-2/4 animate-pulse"></div>
            </div>

            <!-- Company Info - Compact Grid -->
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-sm mb-3">
              <div class="space-y-2">
                <div class="h-4 bg-gray-200 rounded animate-pulse"></div>
                <div class="h-4 bg-gray-200 rounded w-5/6 animate-pulse"></div>
              </div>
              <div class="space-y-2">
                <div class="h-4 bg-gray-200 rounded animate-pulse"></div>
                <div class="h-4 bg-gray-200 rounded w-4/5 animate-pulse"></div>
              </div>
              <div class="space-y-2 lg:col-span-2">
                <div class="h-4 bg-gray-200 rounded animate-pulse"></div>
                <div class="h-4 bg-gray-200 rounded w-3/4 animate-pulse"></div>
              </div>
            </div>

            <!-- Website Row -->
            <div class="space-y-2">
              <div class="h-4 bg-gray-200 rounded animate-pulse w-2/3"></div>
            </div>
          </div>
        </div>
      </div>
    </header>

    <!-- Tabs Navigation Skeleton -->
    <nav class="bg-white rounded-lg shadow-sm border border-gray-200 p-1 flex gap-1 mb-6">
      <div class="flex-1 h-12 bg-gray-200 rounded-md animate-pulse"></div>
      <div class="flex-1 h-12 bg-gray-200 rounded-md animate-pulse"></div>
    </nav>

    <!-- Form Skeleton -->
    <div class="space-y-6">
      <!-- Section 1 Skeleton -->
      <section class="bg-white border border-gray-200 rounded-xl p-8 shadow-sm">
        <div class="flex items-center gap-3 mb-6">
          <div class="w-10 h-10 bg-gray-300 rounded-lg animate-pulse"></div>
          <div class="flex-1">
            <div class="h-6 bg-gray-300 rounded-lg w-1/3 animate-pulse mb-2"></div>
            <div class="h-4 bg-gray-200 rounded-lg w-1/2 animate-pulse"></div>
          </div>
        </div>
        <div class="space-y-4">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="h-12 bg-gray-200 rounded-lg animate-pulse"></div>
            <div class="h-12 bg-gray-200 rounded-lg animate-pulse"></div>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="h-12 bg-gray-200 rounded-lg animate-pulse"></div>
            <div class="h-12 bg-gray-200 rounded-lg animate-pulse"></div>
          </div>
          <div class="h-12 bg-gray-200 rounded-lg animate-pulse"></div>
        </div>
      </section>

      <!-- Section 2 Skeleton -->
      <section class="bg-white border border-gray-200 rounded-xl p-8 shadow-sm">
        <div class="flex items-center gap-3 mb-6">
          <div class="w-10 h-10 bg-gray-300 rounded-lg animate-pulse"></div>
          <div class="flex-1">
            <div class="h-6 bg-gray-300 rounded-lg w-1/3 animate-pulse mb-2"></div>
            <div class="h-4 bg-gray-200 rounded-lg w-1/2 animate-pulse"></div>
          </div>
        </div>
        <div class="space-y-4">
          <div class="h-24 bg-gray-200 rounded-lg animate-pulse"></div>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="h-12 bg-gray-200 rounded-lg animate-pulse"></div>
            <div class="h-12 bg-gray-200 rounded-lg animate-pulse"></div>
          </div>
        </div>
      </section>

      <!-- Section 3 Skeleton -->
      <section class="bg-white border border-gray-200 rounded-xl p-8 shadow-sm">
        <div class="flex items-center gap-3 mb-6">
          <div class="w-10 h-10 bg-gray-300 rounded-lg animate-pulse"></div>
          <div class="flex-1">
            <div class="h-6 bg-gray-300 rounded-lg w-1/3 animate-pulse mb-2"></div>
            <div class="h-4 bg-gray-200 rounded-lg w-1/2 animate-pulse"></div>
          </div>
        </div>
        <div class="space-y-4">
          <div class="h-32 bg-gray-200 rounded-lg animate-pulse"></div>
          <div class="h-20 bg-gray-200 rounded-lg animate-pulse"></div>
        </div>
      </section>

      <!-- Section 4 Skeleton -->
      <section class="bg-white border border-gray-200 rounded-xl p-8 shadow-sm">
        <div class="flex items-center gap-3 mb-6">
          <div class="w-10 h-10 bg-gray-300 rounded-lg animate-pulse"></div>
          <div class="flex-1">
            <div class="h-6 bg-gray-300 rounded-lg w-1/3 animate-pulse mb-2"></div>
            <div class="h-4 bg-gray-200 rounded-lg w-1/2 animate-pulse"></div>
          </div>
        </div>
        <div class="h-32 bg-gray-200 rounded-lg border-2 border-dashed border-gray-300 animate-pulse"></div>
      </section>

      <!-- Button Skeleton -->
      <div class="flex flex-col items-center gap-6 pt-4">
        <div class="h-14 w-full md:w-auto md:px-12 bg-gray-300 rounded-xl animate-pulse"></div>
      </div>
    </div>
  `
})
export class ComplaintsBookSkeletonComponent {}
