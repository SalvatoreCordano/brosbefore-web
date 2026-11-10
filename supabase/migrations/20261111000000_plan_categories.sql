-- Familias de planes: cada una es una pestaña de la página /planes (Wedding, Dates, Proposal).
-- Los planes que ya existen son Wedding. Para sumar una familia nueva hay que ampliar este check y la lista del código.

alter table plans add column category text not null default 'wedding'
  check (category in ('wedding', 'dates', 'proposal'));
