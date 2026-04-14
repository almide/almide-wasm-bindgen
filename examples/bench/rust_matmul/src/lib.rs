use wasm_bindgen::prelude::*;

// Naive matmul with cache-friendly i,k,j order.
#[wasm_bindgen]
pub fn matmul(a: &[f64], b: &[f64], rows: usize, inner: usize, cols: usize) -> Vec<f64> {
    let mut out = vec![0.0f64; rows * cols];
    for i in 0..rows {
        for k in 0..inner {
            let aik = a[i * inner + k];
            for j in 0..cols {
                out[i * cols + j] += aik * b[k * cols + j];
            }
        }
    }
    out
}

#[wasm_bindgen]
pub fn scale_add(a: &[f64], b: &[f64], ka: f64, kb: f64) -> Vec<f64> {
    let n = a.len();
    let mut out = vec![0.0f64; n];
    for i in 0..n {
        out[i] = a[i] * ka + b[i] * kb;
    }
    out
}
