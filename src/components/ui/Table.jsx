import React from 'react';

/**
 * Table — Tabela estilizada com header e rows hover
 * 
 * Uso:
 *   <Table>
 *     <Table.Header>
 *       <Table.HeaderCell>Nome</Table.HeaderCell>
 *       <Table.HeaderCell>Status</Table.HeaderCell>
 *       <Table.HeaderCell align="right">Ações</Table.HeaderCell>
 *     </Table.Header>
 *     <Table.Body>
 *       <Table.Row>
 *         <Table.Cell>Item 1</Table.Cell>
 *         <Table.Cell><Badge>Ativo</Badge></Table.Cell>
 *         <Table.Cell align="right"><Button size="sm">Editar</Button></Table.Cell>
 *       </Table.Row>
 *     </Table.Body>
 *   </Table>
 */

const Table = React.memo(function Table({ children, className = '' }) {
  return (
    <div className={`w-full ${className}`}>
      {children}
    </div>
  );
});

const Header = React.memo(function Header({ children, className = '' }) {
  return (
    <div className={`
      flex items-center px-4 pb-3
      border-b border-surface-border
      ${className}
    `.trim().replace(/\s+/g, ' ')}>
      {children}
    </div>
  );
});

const HeaderCell = React.memo(function HeaderCell({
  children,
  width,
  align = 'left',
  flex,
  className = '',
}) {
  return (
    <div
      className={`
        text-xs font-semibold text-ink-faint
        uppercase tracking-wider
        ${align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left'}
        ${className}
      `.trim().replace(/\s+/g, ' ')}
      style={{ width, flex }}
    >
      {children}
    </div>
  );
});

const Body = React.memo(function Body({ children, className = '' }) {
  return (
    <div className={`flex flex-col gap-0.5 pt-1 ${className}`}>
      {children}
    </div>
  );
});

const Row = React.memo(function Row({
  children,
  onClick,
  active = false,
  className = '',
  ...props
}) {
  return (
    <div
      onClick={onClick}
      className={`
        flex items-center px-4 py-3
        rounded-xl
        transition-colors duration-100
        hover:bg-surface-hover
        ${active ? 'bg-brand-50' : ''}
        ${onClick ? 'cursor-pointer' : ''}
        ${className}
      `.trim().replace(/\s+/g, ' ')}
      {...props}
    >
      {children}
    </div>
  );
});

const Cell = React.memo(function Cell({
  children,
  width,
  align = 'left',
  flex,
  className = '',
}) {
  return (
    <div
      className={`
        text-sm text-ink-base
        ${align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left'}
        ${className}
      `.trim().replace(/\s+/g, ' ')}
      style={{ width, flex }}
    >
      {children}
    </div>
  );
});

Table.Header = Header;
Table.HeaderCell = HeaderCell;
Table.Body = Body;
Table.Row = Row;
Table.Cell = Cell;

export default Table;
