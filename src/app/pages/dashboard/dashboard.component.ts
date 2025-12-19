import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ClaimsService } from '../../services/claims.service';
import { IClaim } from '../../interfaces/claim.interface';

@Component({
  selector: 'app-dashboard',
  imports: [CommonModule, FormsModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css',
})
export class DashboardComponent implements OnInit {
  loading = false;
  error: string | null = null;

  claims: IClaim[] = [];
  filtered: IClaim[] = [];

  total = 0;
  responded = 0;
  pending = 0;

  searchTerm = '';

  constructor(private claimsService: ClaimsService) {}

  ngOnInit(): void {
    this.fetchClaims();
  }

  private fetchClaims(): void {
    this.loading = true;
    this.error = null;
    this.claimsService.getClaims().subscribe({
      next: (list) => {
        // sort by creation_date desc
        this.claims = [...list].sort((a, b) => new Date(b.creation_date).getTime() - new Date(a.creation_date).getTime());
        this.recompute();
      },
      error: (e) => {
        this.error = e?.error?.message || 'No se pudo cargar los reclamos';
      },
      complete: () => {
        this.loading = false;
      }
    });
  }

  onSearch(term: string) {
    this.searchTerm = term;
    this.recompute();
  }

  private recompute() {
    const term = this.searchTerm.trim().toLowerCase();

    const match = (c: IClaim) => {
      if (!term) return true;
      const customer = `${c.Customer?.first_name || ''} ${c.Customer?.last_name || ''}`.toLowerCase();
      const code = (c.code || '').toLowerCase();
      const doc = (c.Customer?.document_number || '').toLowerCase();
      const type = (c.ClaimType?.name || '').toLowerCase();
      return customer.includes(term) || code.includes(term) || doc.includes(term) || type.includes(term);
    };

    this.filtered = this.claims.filter(match);
    this.total = this.claims.length;
    this.responded = this.claims.filter(c => !!c.response || !!c.resolved).length;
    this.pending = this.total - this.responded;
  }

  statusInfo(c: IClaim) {
    const isResolved = !!c.response || !!c.resolved;
    return {
      label: isResolved ? 'Respondido' : 'Pendiente',
      pending: !isResolved
    };
  }

  date(d?: string | null) {
    if (!d) return '';
    try { return new Date(d).toLocaleDateString(); } catch { return ''; }
  }

  timeAgo(d?: string | null) {
    if (!d) return '';
    const diff = Date.now() - new Date(d).getTime();
    const hours = Math.floor(diff / 3_600_000);
    if (hours < 24) return `hace ${hours} horas`;
    const days = Math.floor(hours / 24);
    return `hace ${days} días`;
  }

  amount(c: IClaim) {
    const sym = c.Currency?.symbol || '';
    const val = Number(c.claimed_amount);
    return isFinite(val) ? `${sym ? sym + ' ' : ''}${val.toFixed(2)}` : `${sym} ${c.claimed_amount}`;
  }

  exportCsv() {
    const rows = [
      ['Código','Estado','Tipo','Cliente','Documento','Monto','Creación','Respuesta'],
      ...this.filtered.map(c => [
        c.code,
        (c.response || c.resolved) ? 'Respondido' : 'Pendiente',
        c.ClaimType?.name || '',
        `${c.Customer?.first_name || ''} ${c.Customer?.last_name || ''}`.trim(),
        c.Customer?.document_number || '',
        this.amount(c),
        this.date(c.creation_date),
        this.date(c.response_date)
      ])
    ];
    const csv = rows.map(r => r.map(v => `"${(v ?? '').toString().replace(/"/g,'""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reclamos_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  view(c: IClaim) {
    // Placeholder: later route to a detail page
    alert(`Código: ${c.code}`);
  }
}
