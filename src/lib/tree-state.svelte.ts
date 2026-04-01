const STORAGE_KEY = "seating-chart-tree-state";

let _persistedState: Record<string, boolean> = $state({});
let _searchExpanded: Set<string> | null = $state(null);

function loadTreeState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      _persistedState = JSON.parse(raw);
    }
  } catch {
    // Ignore corrupt data
  }
}

function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(_persistedState));
}

function isTableExpanded(tableId: string): boolean {
  if (_searchExpanded !== null) {
    return _searchExpanded.has(tableId);
  }
  return _persistedState[tableId] ?? true;
}

function toggleTable(tableId: string) {
  const current = _persistedState[tableId] ?? true;
  _persistedState = { ..._persistedState, [tableId]: !current };
  persist();
}

function expandTable(tableId: string) {
  if (!(_persistedState[tableId] ?? true)) {
    _persistedState = { ..._persistedState, [tableId]: true };
    persist();
  }
}

function setSearchExpandedTables(tableIds: string[] | null) {
  _searchExpanded = tableIds ? new Set(tableIds) : null;
}

export {
  loadTreeState,
  isTableExpanded,
  toggleTable,
  expandTable,
  setSearchExpandedTables,
};
