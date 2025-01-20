// @ts-check
'use strict'

import LogicEngine from './logic.js'
import AsyncLogicEngine from './asyncLogic.js'
import Compiler from './compiler.js'
import Constants from './constants.js'
import defaultMethods from './defaultMethods.js'
import { asLogicSync, asLogicAsync } from './asLogic.js'
import { splitPath, splitPathMemoized } from './utilities/splitPath.js'
import jsonLogic from './shim.js'

export { splitPath, splitPathMemoized }
export { LogicEngine }
export { AsyncLogicEngine }
export { Compiler }
export { Constants }
export { defaultMethods }
export { asLogicSync }
export { asLogicAsync }
export { jsonLogic }

export default { LogicEngine, AsyncLogicEngine, Compiler, Constants, defaultMethods, asLogicSync, asLogicAsync, splitPath, splitPathMemoized, jsonLogic }
