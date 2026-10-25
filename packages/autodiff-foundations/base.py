"""Reuse the canonical P096 model without copying its training implementation."""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent / 'neural-foundations'))
from neural import Layer, initialize, gradients, dense, forward, sigmoid, binary_loss, deserialize
