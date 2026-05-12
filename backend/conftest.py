import sys

# ── distutils shim for Python 3.12+ (Tests) ────────────────────
try:
    import distutils
except ImportError:
    try:
        import setuptools.distutils as distutils
        sys.modules['distutils'] = distutils
    except ImportError:
        pass
