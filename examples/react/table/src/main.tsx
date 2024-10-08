import * as React from 'react'
import { useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { inferSchema, initParser } from 'udsv'

import { useVirtualizer } from '@tanstack/react-virtual'
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table'
import type { ColumnDef, Row, SortingState } from '@tanstack/react-table'
import './index.css'

interface Table {
  cols: Array<ColumnDef<any>>
  data: Array<Record<string, unknown>>
}

interface CSVDropperProps {
  setData: (table: Table | null) => void
}

function CSVDropper(props: CSVDropperProps) {
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()

    for (const item of e.dataTransfer.items) {
      if (item.kind == 'file') {
        const file = item.getAsFile()!

        if (file.name.endsWith('.csv')) {
          file.text().then((text) => {
            console.time('parse')

            const s = inferSchema(text)
            const p = initParser(s)
            const d = p.typedObjs(text)

            console.timeEnd('parse')

            const cols: Array<ColumnDef<any>> = s.cols.map((c) => ({
              header: c.name,
              accessorKey: c.name,
            }))

            props.setData({ cols, data: d })
          })
        }
      }
    }
  }

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  return (
    <div
      style={{
        width: '600px',
        height: '600px',
        background: 'pink',
        userSelect: 'none',
      }}
      onDrop={onDrop}
      onDragOver={onDragOver}
    >
      Drag/drop CSV here...
    </div>
  )
}

// Table using insane amount of memory even with virtualisation when scrolling #5696
// https://github.com/TanStack/table/issues/5696

function ReactTableVirtualized({ table }: { table: Table }) {
  const [sorting, setSorting] = React.useState<SortingState>([])

  const table2 = useReactTable({
    data: table.data,
    columns: table.cols,
    state: {
      sorting,
    },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    enableColumnResizing: false,
    defaultColumn: {
      // minSize: 100,
      // maxSize: 1000,
      size: 170,
    },
  })

  const { rows } = table2.getRowModel()

  const parentRef = useRef<HTMLDivElement>(null)

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 17.33,
    overscan: 20,
  })

  return (
    <div ref={parentRef} className="container">
      <div style={{ height: `${virtualizer.getTotalSize()}px` }}>
        <table
          {...{
            style: {
              width: table2.getCenterTotalSize(),
            },
          }}
        >
          <thead>
            {table2.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <th
                      key={header.id}
                      colSpan={header.colSpan}
                      style={{ width: header.getSize() }}
                    >
                      {header.isPlaceholder ? null : (
                        <div
                          {...{
                            className: header.column.getCanSort()
                              ? 'cursor-pointer select-none'
                              : '',
                            onClick: header.column.getToggleSortingHandler(),
                          }}
                        >
                          {flexRender(
                            header.column.columnDef.header,
                            header.getContext(),
                          )}
                          {{
                            asc: ' 🔼',
                            desc: ' 🔽',
                          }[header.column.getIsSorted() as string] ?? null}
                        </div>
                      )}
                    </th>
                  )
                })}
              </tr>
            ))}
          </thead>
          <tbody>
            {virtualizer.getVirtualItems().map((virtualRow, index) => {
              const row = rows[virtualRow.index]
              return (
                <tr
                  key={row.id}
                  style={{
                    height: `${virtualRow.size}px`,
                    transform: `translateY(${
                      virtualRow.start - index * virtualRow.size
                    }px)`,
                  }}
                >
                  {row.getVisibleCells().map((cell) => {
                    return (
                      <td key={cell.id}>
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext(),
                        )}
                      </td>
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function App() {
  const [table, setTable] = useState<Table | null>(null)

  if (table == null) {
    return <CSVDropper setData={setTable} />
  }

  return <ReactTableVirtualized table={table} />
}

const container = document.getElementById('root')
const root = createRoot(container!)
const { StrictMode } = React

root.render(
  <StrictMode>
    <App />
  </StrictMode>,
)
