"use client";

import React from "react";
import { useTranslation } from "react-i18next";

export interface TableColumn {
  label: string | React.ReactElement;
  key: string;
  type?: string;
  className?: string;
  customClassName?: string;
}

interface TableProps {
  columns: TableColumn[];
  data: Record<string, any>[];
  renderCell?: (
    column: TableColumn,
    rowData: Record<string, any>
  ) => React.ReactElement;
}

const Table: React.FC<TableProps> = ({ columns, data, renderCell }) => {
  const { t } = useTranslation();

  return (
    <div className="table-container w-full overflow-x-auto">
      <table className="min-w-max w-full border-collapse">
        {/* Table Head */}
        <thead>
          <tr>
            {columns.map((col, index) => (
              <th
                key={index}
                className={`border-b pb-3 text-left rtl:text-right text-[#181822CC]/80 text-xl mobilescreen:text-sm mobilescreen:pr-8 font-semibold whitespace-nowrap pr-8 ${
                  col.customClassName || ""
                }`}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>

        {/* Table Body */}
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                className="border-b p-3 text-[#181822CC]/80 text-lg xss:text-sm font-normal text-center"
              >
                {t("COMMON.NO_DATA_AVAILABLE")}
              </td>
            </tr>
          ) : (
            data.map((row, rowIndex) => (
              <tr key={rowIndex}>
                {columns.map((col, colIndex) => (
                  <td
                    key={colIndex}
                    className={`border-b py-3 text-[#181822CC]/80 text-lg font-normal whitespace-nowrap mobilescreen:text-sm mobilescreen:pr-8 pr-8 not-italic no-underline text-inherit cursor-pointer ${
                      col.customClassName || ""
                    }`}
                  >
                    {renderCell ? renderCell(col, row) : (row[col.key] ?? "-")}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};

export default Table;
