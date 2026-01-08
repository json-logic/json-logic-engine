// @ts-check
'use strict'

import LogicEngine from './logic.js'
import AsyncLogicEngine from './asyncLogic.js'
import Constants from './constants.js'
import defaultMethods from './defaultMethods.js'
import { splitPath, splitPathMemoized } from './utilities/splitPath.js'

export { splitPath, splitPathMemoized }
export { LogicEngine }
export { AsyncLogicEngine }
export { Constants }
export { defaultMethods }

export default { LogicEngine, AsyncLogicEngine, Constants, defaultMethods, splitPath, splitPathMemoized }
