# Genera un .wav por frase con la voz rioplatense es_AR-daniela de Piper (la voz del juego).
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
cfg = SynthesisConfig(length_scale=1.15, noise_scale=0.7, noise_w_scale=0.85)  # pausada y con algo de variación natural
# Silencio después de cada oración según cómo termina
PAUSE = {'.': 0.55, '!': 0.55, '?': 0.6, '…': 0.75, ':': 0.4, ';': 0.4, '': 0.4}

def ipa(chunk):
    buf = ctypes.c_char_p(chunk.encode()); out = []
    ptr = ctypes.pointer(buf)
    while ptr.contents.value:
        r = lib.espeak_TextToPhonemes(ptr, 1, 0x02)  # UTF-8, salida IPA
        if r: out.append(r.decode())
    return re.sub(r'\([^)]+\)', '', ' '.join(out))

def sentences(text):
    # Cada ORACIÓN se sintetiza entera: las comas quedan adentro (el modelo hace la pausa y sigue la curva
    # de la pregunta o de la exclamación de punta a punta). Antes se cortaba en cada coma y las preguntas
    # perdían la entonación.
    out = []
    for sent in re.findall(r'[^.!?…:;]+[.!?…:;]*', text):
        sent = sent.strip()
        if not re.search(r'\w', sent): continue
        m = re.match(r'(.*?)([.!?…:;]*)$', sent); body, punct = m.group(1), m.group(2)
        term = punct[:1] if punct else ''
        clauses = [c.strip(' ¿¡"«»') for c in re.split(r',', body) if re.search(r'\w', c)]
        mark = '?' if term == '?' or '¿' in body else '!' if term == '!' else '.'
        ph = ', '.join(ipa(c) for c in clauses) + mark
        out.append((list(unicodedata.normalize('NFD', ph)), PAUSE.get(term, 0.4)))
    return out

def synth(text):
    rate = voice.config.sample_rate; pieces = [np.zeros(int(rate * 0.06), dtype=np.float32)]
    for ph, pause in sentences(text):
        audio = voice.phoneme_ids_to_audio(voice.phonemes_to_ids(ph), cfg)
        pieces += [audio, np.zeros(int(rate * pause), dtype=np.float32)]
    a = np.concatenate(pieces)
    # volumen parejo entre frases (misma intensidad media) sin pasarse del pico
    rms = np.sqrt(np.mean(a[np.abs(a) > 0.01] ** 2)) if np.any(np.abs(a) > 0.01) else 0.1
    a = a * (0.12 / max(rms, 1e-4)); a = a / max(1.0, np.abs(a).max() / 0.95)
    f = int(rate * 0.015); a[:f] *= np.linspace(0, 1, f); a[-f:] *= np.linspace(1, 0, f)  # sin clics
    return (a * 32767).astype(np.int16).tobytes(), rate

items = json.load(open(sys.argv[1])); out = Path(sys.argv[2]); out.mkdir(parents=True, exist_ok=True)
for key, text in items.items():
    pcm, rate = synth(text)
    with wave.open(str(out / f'{key}.wav'), 'wb') as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(rate); w.writeframes(pcm)
    print(key, flush=True)
