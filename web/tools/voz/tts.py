# Genera un .wav por frase con la voz es_AR-daniela de Piper.
# La fonética la hace espeak-ng (paquete espeakng-loader) vía ctypes, porque el módulo
# de espeak que trae piper-tts para Mac Intel no encuentra sus datos.
# Uso: python tts.py frases.json carpeta_salida/
import ctypes, json, re, sys, unicodedata, wave
from pathlib import Path
import numpy as np
import espeakng_loader
from piper import PiperVoice, SynthesisConfig

lib = ctypes.cdll.LoadLibrary(espeakng_loader.get_library_path())
lib.espeak_Initialize.argtypes = [ctypes.c_int, ctypes.c_int, ctypes.c_char_p, ctypes.c_int]
lib.espeak_SetVoiceByName.argtypes = [ctypes.c_char_p]
lib.espeak_TextToPhonemes.restype = ctypes.c_char_p
lib.espeak_TextToPhonemes.argtypes = [ctypes.POINTER(ctypes.c_char_p), ctypes.c_int, ctypes.c_int]
data_parent = str(Path(espeakng_loader.get_data_path()).parent.relative_to(Path.cwd())).encode()  # ruta corta: espeak la guarda en un búfer chico
assert lib.espeak_Initialize(2, 0, data_parent, 0) > 0, 'espeak no inició'

voice = PiperVoice.load('model/es_AR-daniela-high.onnx')
lib.espeak_SetVoiceByName(voice.config.espeak_voice.encode())
cfg = SynthesisConfig(length_scale=1.1, noise_scale=0.6, noise_w_scale=0.8)

def ipa(chunk):
    buf = ctypes.c_char_p(chunk.encode()); out = []
    ptr = ctypes.pointer(buf)
    while ptr.contents.value:
        r = lib.espeak_TextToPhonemes(ptr, 1, 0x02)  # UTF-8, salida IPA
        if r: out.append(r.decode())
    return re.sub(r'\([^)]+\)', '', ' '.join(out))

def sentences(text):
    # Separa en cláusulas conservando la puntuación (como hace Piper)
    parts = re.findall(r'[^,.;:!?…]+[,.;:!?…]*', text)
    sent, cur = [], []
    for p in parts:
        m = re.match(r'(.*?)([,.;:!?…]*)$', p.strip()); body, punct = m.group(1), m.group(2)
        if not body: continue
        ph = ipa(body)
        term = (punct[:1] or '').replace('…', '.')
        ph += term
        if term in (',', ':', ';'): ph += ' '
        cur.extend(list(unicodedata.normalize('NFD', ph)))
        if term in ('.', '!', '?'): sent.append(cur); cur = []
    if cur: sent.append(cur)
    return sent

def synth(text):
    rate = voice.config.sample_rate; pieces = []
    for ph in sentences(text):
        audio = voice.phoneme_ids_to_audio(voice.phonemes_to_ids(ph), cfg)
        pieces += [audio, np.zeros(int(rate * 0.28), dtype=np.float32)]
    a = np.concatenate(pieces) if pieces else np.zeros(1, dtype=np.float32)
    a = a / max(1e-6, np.abs(a).max()) * 0.92
    return (a * 32767).astype(np.int16).tobytes(), rate

items = json.load(open(sys.argv[1])); out = Path(sys.argv[2]); out.mkdir(parents=True, exist_ok=True)
for key, text in items.items():
    pcm, rate = synth(text)
    with wave.open(str(out / f'{key}.wav'), 'wb') as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(rate); w.writeframes(pcm)
    print(key, flush=True)
