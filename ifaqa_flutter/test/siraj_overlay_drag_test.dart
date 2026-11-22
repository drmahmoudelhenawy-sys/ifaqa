import 'package:flutter_test/flutter_test.dart';
import 'package:ifaqa_flutter/siraj/siraj_state.dart';

/// Tests for the overlay capsule placement during drags
/// ([sirajDragOverlayPlacement]), added 2026-11-22 with the overlay
/// edge-drag fix: the VISIBLE capsule is clamped to the screen (the old
/// native app's CameraPlacement principle), the fixed 380x76 window is
/// centred on the capsule and clamped as before, and the remainder is
/// the capsule's offset inside the window — so the capsule reaches the
/// screen edges instead of stopping a half-window short.
void main() {
  // Typical phone: 360x800 dp logical, idle small pill 170x37.4.
  const screenW = 360.0;
  const screenH = 800.0;
  const winW = 380.0;
  const winH = 76.0;
  const capW = 170.0;
  const capH = 37.4;

  double capsuleLeft(
    ({double winX, double winY, double insetX, double insetY}) p,
  ) => p.winX + (winW - capW) / 2 + p.insetX;

  double capsuleTop(
    ({double winX, double winY, double insetX, double insetY}) p,
  ) => p.winY + (winH - capH) / 2 + p.insetY;

  group('sirajDragOverlayPlacement', () {
    test('free movement centres the window on the capsule (no inset)', () {
      // Start centred (window at x = -10 because it is wider than the
      // screen... on a 360-wide screen the 380 window pins to x = 0, so
      // use a wider screen for the free-movement case).
      final p = sirajDragOverlayPlacement(
        winX: 200,
        winY: 300,
        insetX: 0,
        insetY: 0,
        dx: 30,
        dy: 20,
        capsuleWidth: capW,
        capsuleHeight: capH,
        windowWidth: winW,
        windowHeight: winH,
        screenWidth: 800,
        screenHeight: 1200,
      );
      // The window moves 1:1 with the finger and stays centred on the
      // capsule.
      expect(p.winX, 230);
      expect(p.winY, 320);
      expect(p.insetX, 0);
      expect(p.insetY, 0);
    });

    test('top edge: capsule reaches y=0 (no dead zone)', () {
      // Window pinned to the top clamp (y=0); drag further up: the
      // capsule must keep moving up inside the window until its own top
      // reaches the screen's top edge.
      var p = (
        winX: 0.0,
        winY: 0.0,
        insetX: 0.0,
        insetY: 0.0,
      );
      for (var i = 0; i < 20; i++) {
        final next = sirajDragOverlayPlacement(
          winX: p.winX,
          winY: p.winY,
          insetX: p.insetX,
          insetY: p.insetY,
          dx: 0,
          dy: -10,
          capsuleWidth: capW,
          capsuleHeight: capH,
          windowWidth: winW,
          windowHeight: winH,
          screenWidth: screenW,
          screenHeight: screenH,
        );
        p = next;
      }
      expect(p.winY, 0); // window clamped
      expect(capsuleTop(p), 0); // capsule AT the top edge
    });

    test('left and right edges: capsule reaches both screen edges', () {
      var p = (winX: 0.0, winY: 100.0, insetX: 0.0, insetY: 0.0);
      // Drag far left.
      for (var i = 0; i < 50; i++) {
        final next = sirajDragOverlayPlacement(
          winX: p.winX,
          winY: p.winY,
          insetX: p.insetX,
          insetY: p.insetY,
          dx: -10,
          dy: 0,
          capsuleWidth: capW,
          capsuleHeight: capH,
          windowWidth: winW,
          windowHeight: winH,
          screenWidth: screenW,
          screenHeight: screenH,
        );
        p = next;
      }
      expect(capsuleLeft(p), 0); // capsule AT the left edge
      // Drag far right.
      for (var i = 0; i < 100; i++) {
        final next = sirajDragOverlayPlacement(
          winX: p.winX,
          winY: p.winY,
          insetX: p.insetX,
          insetY: p.insetY,
          dx: 10,
          dy: 0,
          capsuleWidth: capW,
          capsuleHeight: capH,
          windowWidth: winW,
          windowHeight: winH,
          screenWidth: screenW,
          screenHeight: screenH,
        );
        p = next;
      }
      expect(capsuleLeft(p), screenW - capW); // AT the right edge
    });

    test('capsule never leaves the screen during mixed drags', () {
      var p = (winX: 0.0, winY: 0.0, insetX: 0.0, insetY: 0.0);
      final deltas = [
        [25.0, -40.0],
        [-60.0, 15.0],
        [5.0, 90.0],
        [-3.0, -7.0],
        [200.0, 400.0],
        [-500.0, -500.0],
      ];
      for (final d in deltas) {
        final next = sirajDragOverlayPlacement(
          winX: p.winX,
          winY: p.winY,
          insetX: p.insetX,
          insetY: p.insetY,
          dx: d[0],
          dy: d[1],
          capsuleWidth: capW,
          capsuleHeight: capH,
          windowWidth: winW,
          windowHeight: winH,
          screenWidth: screenW,
          screenHeight: screenH,
        );
        p = next;
        expect(capsuleLeft(p), inInclusiveRange(0, screenW - capW));
        expect(capsuleTop(p), inInclusiveRange(0, screenH - capH));
        // The capsule stays fully inside the window horizontally, so it
        // is never clipped by the window's own bounds.
        expect((winW - capW) / 2 + p.insetX, inInclusiveRange(0, winW - capW));
      }
    });

    test('dragging back from an edge recentres the window smoothly', () {
      // At the top edge (capsule y=0, inset negative), drag down a
      // little: the capsule follows 1:1 and the inset shrinks toward 0
      // before the window moves.
      var p = sirajDragOverlayPlacement(
        winX: 0,
        winY: 0,
        insetX: 0,
        insetY: 0,
        dx: 0,
        dy: -100,
        capsuleWidth: capW,
        capsuleHeight: capH,
        windowWidth: winW,
        windowHeight: winH,
        screenWidth: screenW,
        screenHeight: screenH,
      );
      expect(capsuleTop(p), 0);
      final before = capsuleTop(p);
      p = sirajDragOverlayPlacement(
        winX: p.winX,
        winY: p.winY,
        insetX: p.insetX,
        insetY: p.insetY,
        dx: 0,
        dy: 10,
        capsuleWidth: capW,
        capsuleHeight: capH,
        windowWidth: winW,
        windowHeight: winH,
        screenWidth: screenW,
        screenHeight: screenH,
      );
      expect(capsuleTop(p), before + 10); // followed the finger 1:1
      expect(p.insetY, inInclusiveRange(-(winH - capH) / 2, 0));
    });
  });
}
