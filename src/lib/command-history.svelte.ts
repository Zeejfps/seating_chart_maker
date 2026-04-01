import type { Command } from "./types";

let undoStack: Command[] = $state([]);
let redoStack: Command[] = $state([]);

function getCanUndo(): boolean {
  return undoStack.length > 0;
}

function getCanRedo(): boolean {
  return redoStack.length > 0;
}

function executeCommand(cmd: Command) {
  cmd.execute();
  undoStack = [...undoStack, cmd];
  redoStack = [];
}

function undo() {
  if (!undoStack.length) return;
  const cmd = undoStack[undoStack.length - 1];
  undoStack = undoStack.slice(0, -1);
  cmd.undo();
  redoStack = [...redoStack, cmd];
}

function redo() {
  if (!redoStack.length) return;
  const cmd = redoStack[redoStack.length - 1];
  redoStack = redoStack.slice(0, -1);
  cmd.execute();
  undoStack = [...undoStack, cmd];
}

function clearHistory() {
  undoStack = [];
  redoStack = [];
}

export { getCanUndo, getCanRedo, executeCommand, undo, redo, clearHistory };
