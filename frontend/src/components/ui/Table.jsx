/**
 * Tabla reutilizable con columnas configurables.
 * columns: [{ key, label, render? }]
 * data: array de objetos
 * numbered: muestra columna # al inicio (solo visual, no viene de la BD)
 */
export default function Table({ columns, data, emptyText = 'Sin datos', numbered = true }) {
  return (
    <div style={s.wrapper}>
      <table style={s.table}>
        <thead>
          <tr>
            {/* Columna de numeración — solo visual */}
            {numbered && <th style={{ ...s.th, ...s.thNum }}>#</th>}
            {columns.map(col => (
              <th key={col.key} style={s.th}>{col.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td colSpan={columns.length + (numbered ? 1 : 0)} style={s.empty}>
                {emptyText}
              </td>
            </tr>
          ) : (
            data.map((row, i) => (
              <tr
                key={row.id ?? i}
                style={s.tr}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                {/* Número de fila — siempre refleja la posición actual en la lista */}
                {numbered && (
                  <td style={{ ...s.td, ...s.tdNum }}>{i + 1}</td>
                )}
                {columns.map(col => (
                  <td key={col.key} style={s.td}>
                    {col.render ? col.render(row) : row[col.key] ?? '—'}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}

const s = {
  wrapper: {
    overflowX: 'auto',
    borderRadius: 'var(--radius-md)',
    border: '1px solid var(--border)',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '0.85rem',
  },
  th: {
    padding: '10px 14px',
    textAlign: 'left',
    fontWeight: 600,
    fontSize: '0.75rem',
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    background: 'var(--bg-subtle)',
    borderBottom: '1px solid var(--border)',
    whiteSpace: 'nowrap',
  },
  // Columna # más estrecha y centrada
  thNum: {
    width: 40,
    textAlign: 'center',
    paddingLeft: 8,
    paddingRight: 8,
  },
  tr: {
    transition: 'background var(--transition)',
    borderBottom: '1px solid var(--border)',
  },
  td: {
    padding: '10px 14px',
    color: 'var(--text-primary)',
    verticalAlign: 'middle',
    maxWidth: 220,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  // Celda del número — gris suave, centrada
  tdNum: {
    color: 'var(--text-muted)',
    fontSize: '0.75rem',
    fontWeight: 500,
    textAlign: 'center',
    paddingLeft: 8,
    paddingRight: 8,
    maxWidth: 40,
    background: 'var(--bg-subtle)',
  },
  empty: {
    padding: '2.5rem',
    textAlign: 'center',
    color: 'var(--text-muted)',
    fontSize: '0.875rem',
  },
}
