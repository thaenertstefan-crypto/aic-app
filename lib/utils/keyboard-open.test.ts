import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { isKeyboardOpen } from "./keyboard-open.ts";

// Ein iPhone-Hochformat: 812 px Layout-Viewport, Tastatur ~336 px.
const closed = {
  editableFocused: false,
  layoutHeight: 812,
  visualHeight: 812,
  visualOffsetTop: 0,
};
const typing = {
  editableFocused: true,
  layoutHeight: 812,
  visualHeight: 476,
  visualOffsetTop: 0,
};

describe("isKeyboardOpen", () => {
  it("ist offen, wenn ein Feld den Fokus hat und unten eine Lücke klafft", () => {
    assert.equal(isKeyboardOpen(typing), true);
  });

  it("ist zu, solange niemand tippt", () => {
    assert.equal(isKeyboardOpen(closed), false);
  });

  it("bleibt zu bei Hardware-Tastatur — Fokus da, aber keine Lücke", () => {
    // Der Fokus sitzt im Feld, der sichtbare Ausschnitt füllt den Viewport.
    assert.equal(isKeyboardOpen({ ...closed, editableFocused: true }), false);
  });

  it("ist zu, sobald der Fokus weg ist — auch wenn die Lücke stehen bleibt", () => {
    // iOS 26 setzt `offsetTop`/`height` nach dem Schließen nicht zurück
    // (FB19889436). Der Fokus ist das zweite, davon unabhängige Signal.
    assert.equal(isKeyboardOpen({ ...typing, editableFocused: false }), false);
  });

  it("rechnet den verschobenen Ausschnitt heraus", () => {
    // Ohne Tastatur, aber hineingezoomt und ans Seitenende gescrollt: der
    // Ausschnitt ist klein UND weit unten. Ohne `offsetTop` in der Formel
    // sähe das aus wie eine 412-px-Tastatur.
    assert.equal(
      isKeyboardOpen({
        editableFocused: true,
        layoutHeight: 812,
        visualHeight: 400,
        visualOffsetTop: 412,
      }),
      false,
    );
  });

  it("hält eine kleine Lücke für alles außer eine Tastatur", () => {
    const gap = (g: number) =>
      isKeyboardOpen({ ...typing, visualHeight: 812 - g });

    assert.equal(gap(150), false);
    assert.equal(gap(151), true);
  });

  it("bleibt zu, wenn eine Messung fehlt — die Leiste steht lieber da", () => {
    assert.equal(isKeyboardOpen({ ...typing, visualHeight: NaN }), false);
    assert.equal(isKeyboardOpen({ ...typing, layoutHeight: NaN }), false);
    assert.equal(isKeyboardOpen({ ...typing, visualOffsetTop: NaN }), false);
  });
});
