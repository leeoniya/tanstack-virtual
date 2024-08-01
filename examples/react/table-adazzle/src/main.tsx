import * as React from 'react'
import { useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client'
import { inferSchema, initParser } from 'udsv';

import DataGrid from 'react-data-grid';
import type { Column, RenderCellProps } from 'react-data-grid';

import './index.css'
import 'react-data-grid/lib/styles.css';

type Row = Record<string, unknown>;

interface Table {
  cols: Column<Row>[];
  data: Row[];
}

interface CSVDropperProps {
  setData: (table: Table | null) => void;
}

function CSVDropper(props: CSVDropperProps) {
  let onDrop = (e: React.DragEvent) => {
    e.preventDefault();

    for (const item of e.dataTransfer!.items) {
      if (item.kind == "file") {
        let file = item.getAsFile()!;

        if (file.name.endsWith(".csv")) {
          file.text().then((text) => {
            console.time("parse");

            let s = inferSchema(text);
            let p = initParser(s);
            let d = p.typedObjs(text);

            console.timeEnd("parse");

            let cols: Column<Row>[] = s.cols.map(c => ({
              name: c.name,
              key: c.name,
            }));

            props.setData({cols, data: d});
          });
        }
      }
    }
  };

  let onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  return (
    <div style={{
      width: "600px",
      height: "600px",
      background: "pink",
      userSelect: "none",

    }}
    onDrop={onDrop}
    onDragOver={onDragOver}

    >
      Drag/drop CSV here...
    </div>
  );
};


function renderCoordinates(props: RenderCellProps<Row>) {
  return props.row[props.column.key];
}

interface Props {
  table: Table;
}

export default function MillionCells({ table }: Props) {
  const columns: Column<Row>[] = useMemo(() => table.cols.map(c => {
    let col: Column<Row> = {
      key: String(c.name),
      name: c.name,
      maxWidth: 1000,
      resizable: true,
      renderCell: renderCoordinates
    };

    return col;
  }), []);

  return (
    <DataGrid
      columns={columns}
      rows={table.data}
      rowHeight={22}
      className="fill-grid"
    />
  );
}

function App() {
  const [table, setTable] = useState<Table | null>(null);

  if (table == null) {
    return <CSVDropper setData={setTable}/>
  }

  return (
    <MillionCells table={table}/>
  )
}

const container = document.getElementById('root')
const root = createRoot(container!)
const { StrictMode } = React

root.render(
  <StrictMode>
    <App />
  </StrictMode>,
)
