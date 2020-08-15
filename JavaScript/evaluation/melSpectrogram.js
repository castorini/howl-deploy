const tf = require('@tensorflow/tfjs');
const precomputed = require('../common/precomputed');
const Spectogram = require('../common/spectogram');

function MelSpectrogram(config) {
  this.spectrogram = config.featureExtractionConfig.spectrogram;
  this.n_fft = config.featureExtractionConfig.n_fft;
  this.hop_length = config.featureExtractionConfig.hopSize;
  this.win_length = config.featureExtractionConfig.win_length;
  this.window = config.featureExtractionConfig.window;
  this.center = config.featureExtractionConfig.center;
  this.pad_mode = config.featureExtractionConfig.pad_mode;
  this.power = config.featureExtractionConfig.power;
  this.n_mels = config.featureExtractionConfig.melBands;
  this.f_min = config.featureExtractionConfig.f_min;
  this.f_max = config.featureExtractionConfig.f_max;
  this.htk = config.featureExtractionConfig.htk;
  this.norm = config.featureExtractionConfig.norm;

  // console.log("sample_rate: ", this.sample_rate);
  // console.log("spectrogram: ", this.spectrogram);
  // console.log("n_fft: ", this.n_fft);
  // console.log("hop_length: ", this.hop_length);
  // console.log("win_length: ", this.win_length);
  // console.log("window: ", this.window);
  // console.log("center: ", this.center);
  // console.log("pad_mode: ", this.pad_mode);
  // console.log("power: ", this.power);
  // console.log("n_mels: ", this.n_mels);
  // console.log("f_min: ", this.f_min);
  // console.log("f_max: ", this.f_max);
  // console.log("htk: ", this.htk);
  // console.log("norm: ", this.norm);

  if (config.featureExtractionConfig.use_precomputed) {
    console.log("Using precomuted static values");
    this.mel_basis = tf.tensor(precomputed['melBasis'][this.n_mels]);
    this.fft_window = tf.tensor(precomputed['hanningWindow']);
  } else {
    console.log("Computing static values with tfjs");
    // Build a Mel filter
    // build it on the fly
    this.mel_basis = this.mel_filter(
      this.sample_rate, // sr
      this.n_fft, // n_fft
      this.n_mels, // n_mels
      this.f_min, // fmin
      this.f_max, // fmax
      this.htk, // fmax
      this.norm // fmax
    );

    // fft_window
    this.fft_window = this.get_hanning_window(this.n_fft);
  }

  this.spectogram = new Spectogram(config);
}

MelSpectrogram.prototype.pad_center = function(data, size) {
  // assume it will always be one dimensional
  let n = data.shape[0]
  let lpad = Math.floor((size - n) / 2)
  let lengths = [lpad, (size - n - lpad)];
  return data.pad([lengths]);
}

MelSpectrogram.prototype.pad_reflect = function(data, size) {
  // padding with reflect mode
  let n = data.shape[0];

  let lpad_size = Math.floor((size - n) / 2);
  let lpad_index = tf.range(1, lpad_size+1).reverse();
  let lpad = data.gather(lpad_index.toInt());
  let rpad_size = (size - n - lpad_size);
  let rpad_index = tf.range(n-rpad_size-1, n-1).reverse();
  let rpad = data.gather(rpad_index.toInt());

  return lpad.concat(data).concat(rpad);
}

MelSpectrogram.prototype.log10 = function(x) {
  let numerator = tf.log(x)
  let denominator = tf.log(tf.scalar(10))
  return numerator.div(denominator)
}

MelSpectrogram.prototype.hz_to_mel = function(frequencies, htk=false) {
  if (!(frequencies instanceof tf.Tensor)) {
    frequencies = tf.tensor(frequencies);
  }

  if (htk) {
    frequencies = frequencies.div(tf.scalar(700.0)).add(tf.scalar(1.0))
    return this.log10(frequencies).mul(tf.scalar(2595.0))
  }

  // Fill in the linear part
  let f_min = 0.0;
  let f_sp = 200.0/3;

  // Fill in the linear part
  let min_log_hz = 1000.0; // beginning of log region (Hz)
  let min_log_mel = (min_log_hz - f_min) / f_sp // beginning of log region (Mels)
  let logstep = Math.log(6.4) / 27.0;

  let mels = null;

  if (frequencies.shape.length == 0) {
    // constant case
    let freq_value = frequencies.dataSync()[0];

    mels = (freq_value - f_min)/f_sp
    if (freq_value >= min_log_hz) {
      mels = min_log_mel + Math.log(freq_value / min_log_hz) / logstep;
    }
    mels = tf.scalar(mels)
  } else {
    mels = frequencies.sub(f_min).div(f_sp);
    let indices = tf.lessEqual(frequencies, min_log_hz);
    let new_vals = tf.log(frequencies.div(min_log_hz)).div(logstep).add(min_log_mel)
    mels = mels.where(indices, new_vals)
  }

  return mels
}

MelSpectrogram.prototype.mel_to_hz = function(mels, htk=false) {
  if (!(mels instanceof tf.Tensor)) {
    mels = tf.tensor(mels);
  }

  if (htk) {
    return tf.scalar(10.0).pow(mels.div(tf.scalar(2595.0))).sub(tf.scalar(1.0)).mul(tf.scalar(700.0))
  }

  // Fill in the linear part
  let f_min = 0.0;
  let f_sp = 200.0/3;

  // Fill in the linear part
  let min_log_hz = 1000.0; // beginning of log region (Hz)
  let min_log_mel = (min_log_hz - f_min) / f_sp; // beginning of log region (Mels)
  let logstep = Math.log(6.4) / 27.0;

  let freqs = null;

  if (mels.shape.length == 0) {
    // constant case
    let mel_value = mels.dataSync[0];
    freqs = (mel_value * f_sp) + f_min;

    if (mel_value >= min_log_mel) {
      freqs = min_log_mel * Math.exp(logstep * (mels.get(i) - min_log_mel));
    }
    freqs = tf.scalar(freqs)
  } else {
    // array values
    freqs = mels.mul(f_sp).add(f_min);
    let indices = tf.lessEqual(mels, min_log_mel);
    let new_vals = tf.exp(mels.sub(min_log_mel).mul(logstep)).mul(min_log_hz)
    freqs = freqs.where(indices, new_vals);
  }
  return freqs
}

MelSpectrogram.prototype.get_hanning_window = function(
  M
) {
  M = M + 1
  let fac = tf.range(0, M*2, 2);
  fac = fac.mul(Math.PI).div(M-1);

  let k = tf.scalar(1);
  let w = k.sub(fac.cos()).mul(0.5);
  w = tf.slice(w, 0, M-1);
  return w;
}

MelSpectrogram.prototype.mel_filter = function(
  sr,
  n_fft,
  n_mels=128,
  fmin=0.0,
  fmax=null,
  htk=false,
  norm=null,
) {
  if (fmax == null) {
    fmax = sr/2;
  }
  fmax = tf.scalar(fmax)

  let fftfreqs = tf.linspace(0, sr/2, 1 + Math.floor(n_fft/2))

  // 'Center freqs' of mel bands - uniformly spaced between limits
  let min_mel = this.hz_to_mel(fmin, htk).dataSync()[0];
  let max_mel = this.hz_to_mel(fmax, htk).dataSync()[0];

  let mels = tf.linspace(min_mel, max_mel, n_mels+2);

  let mel_f = this.mel_to_hz(mels, htk);
  let former = mel_f.slice(0, mel_f.shape[0] - 1);
  let latter = mel_f.slice(1, mel_f.shape[0] - 1);
  let fdiff = latter.sub(former);

  let ramps = mel_f.reshape([-1, 1]).sub(fftfreqs)

  let weights = []
  let zero_vec = tf.zeros([fftfreqs.shape[0]]);

  for (var i = 0; i < n_mels; i++) {
    // lower and upper slopes for all bins
    let lower = ramps.slice(i, 1).flatten().mul(-1).div(fdiff.slice(i, 1))
    let upper = ramps.slice(i+2, 1).flatten().div(fdiff.slice(i+1, 1))

    // .. then intersect them with each other and zero
    let indices = lower.greaterEqual(upper);
    let row = upper.where(indices, lower);
    indices = row.greaterEqual(zero_vec);
    row = row.where(indices, zero_vec);

    weights.push(row)
  }

  weights = tf.stack(weights)

  if (norm) {
    let enorm = tf.scalar(2.0).div(mel_f.slice(2, n_mels).sub(mel_f.slice(0, n_mels)))

    weights = weights.transpose().mul(enorm).transpose();
  }

  return weights;
}

MelSpectrogram.prototype.stft = function(
  y,
  n_fft=2048,
  hop_length=null,
  win_length=null,
  window='hann',
  center=True,
  pad_mode='reflect'
) {

  // By default, use the entire frame
  if (win_length == null) {
    win_length = n_fft
  }

  // Set the default hop, if it's not already specified
  if (hop_length == null) {
    hop_length = Math.floor(win_length / 4);
  }

  // Pad the time series so that frames are centered
  if (center) {
    y = this.pad_reflect(y, y.shape[0] + n_fft)
  }

  // Window the time series.
  let y_frames = tf.signal.frame(y, n_fft, hop_length);
  let windowed = y_frames.mul(this.fft_window);

  let raw_data = windowed.arraySync();
  let fft_result = []

  for (var i = 0; i < raw_data.length; i++) {
    fft_result.push(this.spectogram.compute(raw_data[i]));
  }

  return tf.stack(fft_result);
}

MelSpectrogram.prototype.compute_spectogram = function(
  y=null,
  S=null,
  n_fft=2048,
  hop_length=512,
  power=1,
  win_length=null,
  window='hann',
  center=true,
  pad_mode='reflect'
) {

  if (S != null) {
    n_fft = 2 * (S.shape[0] - 1)
  } else {
    let transformed = this.stft(
      y,
      n_fft, // n_fft
      hop_length, // hop_length
      win_length, // win_length
      window, // window
      center, // center
      pad_mode // pad_mode
    )

    S = transformed.abs().pow(power).transpose();
  }

  let results = {
    'S': S,
    'n_fft': n_fft
  }

  return results
}

MelSpectrogram.prototype.extract = function(x) {
  if (!(x instanceof tf.Tensor)) {
    x = tf.tensor(x).toFloat();
  }

  let result = this.compute_spectogram(
    x, // y
    null, // S
    this.n_fft, // n_fft
    this.hop_length, // hop_length
    this.power, // power
    this.win_length, // win_length
    this.window, // window
    this.center, // center
    this.pad_mode // pad_mode
  );

  let S = result['S'];
  let n_fft = result['n_fft'];

  return this.mel_basis.dot(S);
}

module.exports = MelSpectrogram
