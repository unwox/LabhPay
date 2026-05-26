"""Modular bank statement parsers. Registry-driven dispatch."""

from parsers.hdfc import HdfcParser
from parsers.icici import IciciParser
from parsers.registry import register
from parsers.sbi import SbiParser

# Register every parser so registry.parse() can dispatch.
register(HdfcParser())
register(SbiParser())
register(IciciParser())
