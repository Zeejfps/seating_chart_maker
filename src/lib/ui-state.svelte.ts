let _isViewOnly: boolean = $state(false);

function getViewOnly(): boolean {
  return _isViewOnly;
}

function toggleViewOnly(): void {
  _isViewOnly = !_isViewOnly;
}

export { getViewOnly, toggleViewOnly };
