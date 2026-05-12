import pandas as pd
import numpy as np
from loguru import logger

def execute_sandbox_script(script: str, data: pd.DataFrame) -> str:
    """
    Executes a generated Python script in a restricted environment.
    Provides the script with `df` (the dataset), `pd`, and `np`.
    Returns the output printed or computed.
    """
    local_env = {
        "df": data.copy(),
        "pd": pd,
        "np": np,
        "result": None
    }
    
    # Restrict builtins to prevent dangerous operations
    safe_builtins = {
        "print": print,
        "len": len,
        "sum": sum,
        "min": min,
        "max": max,
        "abs": abs,
        "round": round,
        "list": list,
        "dict": dict,
        "set": set,
        "tuple": tuple,
        "int": int,
        "float": float,
        "str": str,
        "bool": bool,
    }
    
    global_env = {"__builtins__": safe_builtins}
    
    try:
        logger.info(f"Executing sandboxed script: \n{script}")
        exec(script, global_env, local_env)
        return str(local_env.get("result", "Script executed successfully (no 'result' variable returned)."))
    except Exception as e:
        logger.error(f"Sandbox execution failed: {str(e)}")
        return f"Error executing script: {str(e)}"
