# Elige un iPhone simulado con el iOS más nuevo que tenga la máquina de GitHub, para correr ahí las pruebas.
# Uso: xcrun simctl list devices available -j | python3 ios/elegir_simulador.py
import json
import sys

aparatos = json.load(sys.stdin)["devices"]
for sistema in sorted(aparatos, reverse=True):
    if "iOS" not in sistema:
        continue
    for aparato in aparatos[sistema]:
        if aparato["name"].startswith("iPhone"):
            print(aparato["udid"])
            sys.exit(0)
sys.exit(1)
