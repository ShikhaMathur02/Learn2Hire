import { Fragment, useEffect, useId, useMemo, useState } from "react";
import { ChevronUp } from "lucide-react";

import { Button } from "../ui/button";
import {
  buildCampusStudentTree,
  campusRosterStudentSerial,
  CAMPUS_ROSTER_UNSET_LABEL,
  rosterFaculty,
  rosterRowId,
  rosterStudents,
  studentProgramBranchKeys,
} from "../../lib/campusRosterTree";

function sortStrings(a, b) {
  return a.localeCompare(b, undefined, { sensitivity: "base" });
}

function QuickPickBar({ courses, tree, addSelectedIds, students, faculty, addFilteredStudents }) {
  const [prog, setProg] = useState("");
  const [branch, setBranch] = useState("");

  const branchOptions = useMemo(() => {
    const seen = new Set();
    courses.forEach((c) => {
      if (prog && c !== prog) return;
      Object.keys(tree[c] || {}).forEach((b) => seen.add(b));
    });
    return [...seen].sort(sortStrings);
  }, [courses, tree, prog]);

  useEffect(() => {
    if (branch && !branchOptions.includes(branch)) setBranch("");
  }, [branchOptions, branch]);

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-slate-200/90 bg-white p-4 shadow-sm">
      <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">Quick add to selection</p>
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" size="sm" variant="outline" className="h-9 text-xs shadow-sm" onClick={() => addSelectedIds(students.map(rosterRowId))}>
          All students
        </Button>
        <Button type="button" size="sm" variant="outline" className="h-9 text-xs shadow-sm" onClick={() => addSelectedIds(faculty.map(rosterRowId))}>
          All teachers
        </Button>
      </div>
      <div className="flex flex-wrap items-end gap-2">
        <div className="flex min-w-0 flex-1 flex-wrap gap-2 sm:flex-none">
          <label className="sr-only" htmlFor="college-hier-pick-program">
            Limit by program
          </label>
          <select
            id="college-hier-pick-program"
            className="h-9 min-w-[10rem] flex-1 rounded-lg border border-slate-200 bg-slate-50/80 px-2.5 text-xs text-slate-900 shadow-sm outline-none focus:border-[var(--primary)] sm:flex-none"
            value={prog}
            onChange={(e) => {
              setProg(e.target.value);
              setBranch("");
            }}
          >
            <option value="">Any program</option>
            {courses.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <label className="sr-only" htmlFor="college-hier-pick-branch">
            Limit by branch
          </label>
          <select
            id="college-hier-pick-branch"
            className="h-9 min-w-[10rem] flex-1 rounded-lg border border-slate-200 bg-slate-50/80 px-2.5 text-xs text-slate-900 shadow-sm outline-none focus:border-[var(--primary)] sm:flex-none"
            value={branch}
            onChange={(e) => setBranch(e.target.value)}
          >
            <option value="">Any branch</option>
            {branchOptions.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="soft"
            size="sm"
            className="h-9 text-xs"
            onClick={() =>
              addFilteredStudents({
                programOnly: prog || undefined,
                branchOnly: branch || undefined,
              })
            }
          >
            Add matches
          </Button>
          <Button type="button" variant="outline" size="sm" className="h-9 text-xs" disabled={!prog} title={prog ? "" : "Choose a program first"} onClick={() => prog && addFilteredStudents({ programOnly: prog })}>
            Whole program
          </Button>
        </div>
      </div>
    </div>
  );
}

/**
 * Grouped browse table: checkbox on each row at the far right so it lines up with the main table and toolbar.
 */
export function CollegeRosterGroupedPanel({
  expanded,
  onCollapse,
  roster,
  selectedIds,
  addSelectedIds,
  clearSelectedIds,
  toggleSelectedId,
  onConfirmDeleteMany,
  deleteBusy,
}) {
  const headingId = useId();
  const students = rosterStudents(roster);
  const faculty = rosterFaculty(roster);
  const tree = useMemo(() => buildCampusStudentTree(students), [students]);
  const courses = useMemo(() => Object.keys(tree).sort(sortStrings), [tree]);

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const nSelected = selectedSet.size;

  const facultySorted = useMemo(() => [...faculty].sort((a, b) => sortStrings(String(a.name), String(b.name))), [faculty]);

  /**
   * One block per program + branch. (Grouping by year as well duplicated headers for the same class when
   * year text differed or was missing for some rows.) Year stays on each row.
   */
  const studentSections = useMemo(() => {
    const out = [];
    for (const course of courses) {
      const branches = tree[course] || {};
      for (const branch of Object.keys(branches).sort(sortStrings)) {
        const years = branches[branch] || {};
        const rows = [];
        for (const yearKey of Object.keys(years).sort(sortStrings)) {
          rows.push(...(years[yearKey] || []));
        }
        rows.sort((a, b) => {
          const ya = String(a.studentClass?.year || "").trim() || CAMPUS_ROSTER_UNSET_LABEL;
          const yb = String(b.studentClass?.year || "").trim() || CAMPUS_ROSTER_UNSET_LABEL;
          const yCmp = sortStrings(ya, yb);
          if (yCmp !== 0) return yCmp;
          return sortStrings(String(a.name || ""), String(b.name || ""));
        });
        if (rows.length) out.push({ course, branch, rows });
      }
    }
    return out;
  }, [courses, tree]);

  const addFilteredStudents = ({ programOnly, branchOnly }) => {
    const ids = students
      .filter((u) => {
        const keys = studentProgramBranchKeys(u);
        if (programOnly && keys.program !== programOnly) return false;
        if (branchOnly && keys.branch !== branchOnly) return false;
        return true;
      })
      .map(rosterRowId)
      .filter(Boolean);
    addSelectedIds(ids);
  };

  if (!expanded) return null;

  return (
    <section
      id="college-grouped-roster"
      aria-labelledby={headingId}
      className="mt-5 overflow-hidden rounded-xl border border-slate-200 bg-white"
    >
      <div className="flex flex-col gap-3 border-b border-slate-200/80 px-4 py-4 sm:flex-row sm:items-start sm:justify-between sm:px-5">
        <div className="min-w-0">
          <h3 id={headingId} className="text-base font-semibold tracking-tight text-slate-900 sm:text-lg">
            Everyone by program &amp; class
          </h3>
          <p className="mt-1 max-w-xl text-xs font-medium leading-relaxed text-slate-600 sm:text-sm">
            One scrollable sheet: tick people directly, or use quick add filters. Rows stay aligned so you can skim down
            the list instead of opening nested menus. Deletions are permanent.
          </p>
        </div>
        <Button type="button" variant="outline" size="sm" className="h-10 shrink-0 gap-2 rounded-xl px-4 text-xs font-semibold shadow-sm" onClick={onCollapse}>
          <ChevronUp className="size-4 text-slate-500" aria-hidden />
          Hide this panel
        </Button>
      </div>

      <div className="space-y-4 px-4 py-4 sm:px-5">
        <QuickPickBar
          courses={courses}
          tree={tree}
          addSelectedIds={addSelectedIds}
          students={students}
          faculty={faculty}
          addFilteredStudents={addFilteredStudents}
        />

        {students.length === 0 && faculty.length === 0 ? (
          <p className="text-sm font-medium text-slate-600">No students or teachers here yet.</p>
        ) : (
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <div className="max-h-[min(55vh,32rem)] overflow-auto scroll-smooth [scrollbar-color:rgb(148_163_184)_transparent] [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-300/90">
              <table className="w-full min-w-[680px] table-fixed border-collapse text-left text-sm">
                <thead>
                  <tr className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50 text-[11px] font-semibold uppercase tracking-wide text-slate-600">
                    <th scope="col" className="w-12 px-2 py-2.5 text-center">
                      S.no.
                    </th>
                    <th scope="col" className="w-[min(26%,220px)] px-3 py-2.5">
                      Name
                    </th>
                    <th scope="col" className="hidden w-[34%] px-3 py-2.5 sm:table-cell">
                      Email
                    </th>
                    <th scope="col" className="w-[min(13%,112px)] px-2 py-2.5 md:w-auto">
                      Program
                    </th>
                    <th scope="col" className="w-[min(13%,112px)] px-2 py-2.5 md:w-auto">
                      Branch
                    </th>
                    <th scope="col" className="w-[min(9%,76px)] px-2 py-2.5 md:w-auto">
                      Year
                    </th>
                    <th scope="col" className="w-12 px-3 py-2.5 text-center">
                      <span className="sr-only">Select</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="text-slate-800">
                  {facultySorted.length ? (
                    <>
                      <GroupHeadingRow title="Teachers" count={facultySorted.length}>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="h-8 px-2 text-[11px] font-semibold text-[var(--primary)] hover:bg-slate-100"
                          onClick={() => addSelectedIds(facultySorted.map(rosterRowId).filter(Boolean))}
                        >
                          Select all teachers
                        </Button>
                      </GroupHeadingRow>
                      {facultySorted.map((u) => (
                        <RosterTableRow key={rosterRowId(u) || u.email} user={u} program="—" branch="—" year="—" selectedSet={selectedSet} onToggle={toggleSelectedId} />
                      ))}
                    </>
                  ) : null}

                  {studentSections.length ? (
                    <>
                      <GroupHeadingRow
                        title="Students"
                        count={students.length}
                        subtitle={
                          <p className="text-xs font-medium leading-relaxed text-slate-600">
                            {studentSections.length} program / branch groups · rows are sorted by year, then name. Use the
                            Year column when a cohort mixes multiple years.
                          </p>
                        }
                      />
                      {studentSections.map(({ course, branch, rows }) => {
                        const ids = rows.map(rosterRowId).filter(Boolean);
                        return (
                          <Fragment key={`${course}|||${branch}`}>
                            <GroupHeadingRow
                              title=""
                              subtitle={
                                <span className="flex flex-wrap items-center gap-2 gap-y-1 text-sm font-semibold text-slate-900">
                                  <span className="rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5">{course}</span>
                                  <span className="hidden text-slate-400 sm:inline" aria-hidden>
                                    ·
                                  </span>
                                  <span className="rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5">{branch}</span>
                                  <span className="ml-1 text-xs font-medium tabular-nums text-slate-600">({rows.length})</span>
                                </span>
                              }
                              count={rows.length}
                            >
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="h-8 shrink-0 text-[11px] font-semibold"
                                onClick={() => addSelectedIds(ids)}
                              >
                                Tick group
                              </Button>
                            </GroupHeadingRow>
                            {rows.map((u, idx) => {
                              const yr = String(u.studentClass?.year || "").trim();
                              const yearDisplay = yr || "—";
                              return (
                                <RosterTableRow
                                  key={rosterRowId(u) || u.email}
                                  user={u}
                                  program={course}
                                  branch={branch}
                                  year={yearDisplay}
                                  studentOrdinal={idx + 1}
                                  selectedSet={selectedSet}
                                  onToggle={toggleSelectedId}
                                />
                              );
                            })}
                          </Fragment>
                        );
                      })}
                    </>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-3 border-t border-slate-200 bg-slate-50/80 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <div className="flex flex-wrap items-center gap-3 text-sm font-medium text-slate-700">
          <button
            type="button"
            className="text-[var(--primary)] underline underline-offset-[3px] transition-opacity hover:opacity-90 disabled:opacity-40"
            disabled={deleteBusy}
            onClick={clearSelectedIds}
          >
            Clear selection
          </button>
          <span aria-live="polite">
            Selected: <strong className="tabular-nums text-slate-900">{nSelected}</strong>
          </span>
        </div>
        <Button type="button" variant="destructive" disabled={deleteBusy || nSelected === 0} className="h-10 w-full shrink-0 rounded-xl font-semibold sm:w-auto sm:min-w-[10rem]" onClick={() => onConfirmDeleteMany(selectedIds)}>
          {deleteBusy ? "Removing…" : `Delete selected (${nSelected})`}
        </Button>
      </div>
    </section>
  );
}

function GroupHeadingRow({ title, subtitle, count, children }) {
  return (
    <tr className="border-t border-slate-200 bg-slate-50/95 first:border-t-0">
      <td colSpan={7} className="px-3 py-2.5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            {title ? (
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-600">
                {title}{" "}
                {typeof count === "number" ? (
                  <span className="font-semibold lowercase text-slate-500 tabular-nums">({count})</span>
                ) : null}
              </p>
            ) : null}
            {subtitle ? <div className={title ? "mt-1.5" : ""}>{subtitle}</div> : null}
          </div>
          <div className="flex shrink-0 justify-end">{children}</div>
        </div>
      </td>
    </tr>
  );
}

function RosterTableRow({ user, program, branch, year, studentOrdinal, selectedSet, onToggle }) {
  const id = rosterRowId(user);
  const checked = id ? selectedSet.has(id) : false;
  const isStudent = user.role === "student";
  if (!id) return null;
  const serialLabel = isStudent ? campusRosterStudentSerial(user.studentClass, studentOrdinal) : "—";
  const programCell = program === "—" || !program ? "—" : program;
  const branchCell = branch === "—" || !branch ? "—" : branch;
  const yearCell = year === "—" || !year ? "—" : year;
  return (
    <tr className="border-b border-slate-100 transition-colors hover:bg-sky-50/40">
      <td className="px-2 py-2.5 text-center align-middle text-xs tabular-nums font-medium text-slate-600">
        {serialLabel}
      </td>
      <td className="truncate px-3 py-2.5 align-middle font-medium text-slate-900">
        <span className="block">{user.name}</span>
        <span className="mt-0.5 block truncate text-[11px] font-normal text-slate-500 sm:hidden">{user.email}</span>
      </td>
      <td className="hidden truncate px-3 py-2.5 align-middle text-xs text-slate-600 sm:table-cell">{user.email}</td>
      <td className="truncate px-2 py-2.5 align-middle text-xs font-medium text-slate-700" title={programCell !== "—" ? programCell : undefined}>
        {programCell}
      </td>
      <td className="truncate px-2 py-2.5 align-middle text-xs font-medium text-slate-700" title={branchCell !== "—" ? branchCell : undefined}>
        {branchCell}
      </td>
      <td className="truncate px-2 py-2.5 align-middle text-xs font-medium tabular-nums text-slate-700">{yearCell}</td>
      <td className="px-3 py-2.5 text-center align-middle">
        <input
          type="checkbox"
          checked={checked}
          onChange={() => onToggle(id)}
          aria-label={`Select ${user.name || user.email}`}
          className="size-4 rounded border-slate-300 accent-[var(--primary)]"
        />
      </td>
    </tr>
  );
}
