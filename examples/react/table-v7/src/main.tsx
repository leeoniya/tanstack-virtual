import React, { useCallback, useMemo, useState } from 'react'
import { useBlockLayout, useTable } from 'react-table'
import { FixedSizeList } from 'react-window'

import { createRoot } from 'react-dom/client'
import { inferSchema, initParser } from 'udsv'

import './index.css'

interface ColumnDef {
  Header: string
  accessor: string
}

interface Table {
  cols: Array<ColumnDef>
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

            const cols: Array<ColumnDef> = s.cols.map((c) => ({
              Header: c.name,
              accessor: c.name,
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

// https://codesandbox.io/p/sandbox/tannerlinsley-react-table-virtualized-rows-576ul?file=%2Fsrc%2FApp.js

function ReactTableVirtualized({ table }: { table: Table }) {
  // Use the state and functions returned from useTable to build your UI

  const defaultColumn = useMemo(
    () => ({
      width: 170,
    }),
    [],
  )

  const {
    getTableProps,
    getTableBodyProps,
    headerGroups,
    rows,
    totalColumnsWidth,
    prepareRow,
  } = useTable(
    {
      columns: table.cols,
      data: table.data,
      defaultColumn,
    },
    useBlockLayout,
  )

  const RenderRow = useCallback(
    ({ index, style }: { index: number; style: React.CSSProperties }) => {
      const row = rows[index]
      prepareRow(row)
      return (
        <div
          {...row.getRowProps({
            style,
          })}
          className="tr"
        >
          {row.cells.map((cell) => {
            const cProps = cell.getCellProps();

            cProps.style!.textOverflow = 'ellipsis';
            cProps.style!.overflow = 'hidden';
            cProps.style!.whiteSpace = 'nowrap';

            return (
              <div {...cProps} className="td">
                {cell.render('Cell')}
              </div>
            )
          })}
        </div>
      )
    },
    [prepareRow, rows],
  )

  // Render the UI for your table
  return (
    <div {...getTableProps()} className="table">
      <div>
        {headerGroups.map((headerGroup) => (
          <div {...headerGroup.getHeaderGroupProps()} className="tr">
            {headerGroup.headers.map((column) => (
              <div {...column.getHeaderProps()} className="th">
                {column.render('Header')}
              </div>
            ))}
          </div>
        ))}
      </div>

      <div {...getTableBodyProps()}>
        <FixedSizeList
          height={1300}
          itemCount={rows.length}
          itemSize={22}
          width={totalColumnsWidth}
        >
          {RenderRow}
        </FixedSizeList>
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
