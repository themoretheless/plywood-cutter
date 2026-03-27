/**
 * Box builder — calls Rust WASM for path generation, 3D scene, cutting layout.
 */
import { ensureWasm } from './rustService'

export async function boxPathSide(d: number, h: number, tabH: number, tf: number, nTab: number, shelfYs: number[]): Promise<string> {
  const wasm = await ensureWasm()
  return wasm.box_path_side(d, h, tabH, tf, nTab, JSON.stringify(shelfYs))
}

export async function boxPathTopBottom(w: number, d: number, t: number, tabH: number, tf: number, nTab: number, wi: number): Promise<string> {
  const wasm = await ensureWasm()
  return wasm.box_path_top_bottom(w, d, t, tabH, tf, nTab, wi)
}

export async function boxPathBack(w: number, h: number, t: number, tabH: number, tf: number, nTab: number, wi: number, hi: number, shelfYs: number[]): Promise<string> {
  const wasm = await ensureWasm()
  return wasm.box_path_back(w, h, t, tabH, tf, nTab, wi, hi, JSON.stringify(shelfYs))
}

export async function boxPathShelf(w: number, d: number, t: number, tabH: number, tf: number, nTab: number, wi: number): Promise<string> {
  const wasm = await ensureWasm()
  return wasm.box_path_shelf(w, d, t, tabH, tf, nTab, wi)
}

export async function boxShelfSlotYs(nShelves: number, hi: number, tf: number, t: number): Promise<number[]> {
  const wasm = await ensureWasm()
  return JSON.parse(wasm.box_shelf_slot_ys(nShelves, hi, tf, t))
}

export async function boxSceneJson(
  w: number, h: number, d: number, t: number,
  tabH: number, tf: number, nTab: number,
  wi: number, hi: number, shelfYs: number[], explode: number,
): Promise<string> {
  const wasm = await ensureWasm()
  return wasm.box_scene_json(w, h, d, t, tabH, tf, nTab, wi, hi, JSON.stringify(shelfYs), explode)
}

export async function boxAllPieces(w: number, h: number, d: number, nShelves: number): Promise<any[]> {
  const wasm = await ensureWasm()
  return JSON.parse(wasm.box_all_pieces(w, h, d, nShelves))
}

export async function boxComputeLayout(pieces: any[], sheetW: number, sheetH: number, gap: number): Promise<any[][]> {
  const wasm = await ensureWasm()
  return JSON.parse(await wasm.box_compute_layout(JSON.stringify(pieces), sheetW, sheetH, gap))
}
