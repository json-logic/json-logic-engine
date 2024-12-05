"use strict";(self.webpackChunkjson_logic_engine_documentation=self.webpackChunkjson_logic_engine_documentation||[]).push([[324],{7475:(e,n,i)=>{i.r(n),i.d(n,{assets:()=>c,contentTitle:()=>a,default:()=>p,frontMatter:()=>s,metadata:()=>o,toc:()=>l});const o=JSON.parse('{"id":"doc2","title":"Blazing Fast via Compilation","description":"json-logic-engine has support for logic compilation which greatly enhances run-time performance of your logic. In a number of (simpler) cases, it can get rather close to native performance. Additionally, as of v2.0.0, the interpreter has an optimizer that can cache the execution plan of the logic if re-used, improving interpreted performance without the need for compilation.","source":"@site/docs/doc2.md","sourceDirName":".","slug":"/doc2","permalink":"/json-logic-engine/docs/doc2","draft":false,"unlisted":false,"editUrl":"https://github.com/TotalTechGeek/json-logic-engine-documentation/edit/master/website/docs/doc2.md","tags":[],"version":"current","frontMatter":{"id":"doc2","title":"Blazing Fast via Compilation"},"sidebar":"someSidebar","previous":{"title":"Asynchronous Engine","permalink":"/json-logic-engine/docs/async"},"next":{"title":"Differences from json-logic-js","permalink":"/json-logic-engine/docs/doc3"}}');var t=i(4848),r=i(8453);const s={id:"doc2",title:"Blazing Fast via Compilation"},a=void 0,c={},l=[];function d(e){const n={code:"code",hr:"hr",p:"p",pre:"pre",...(0,r.R)(),...e.components};return(0,t.jsxs)(t.Fragment,{children:[(0,t.jsxs)(n.p,{children:[(0,t.jsx)(n.code,{children:"json-logic-engine"})," has support for logic compilation which greatly enhances run-time performance of your logic. In a number of (simpler) cases, it can get rather close to native performance. Additionally, as of ",(0,t.jsx)(n.code,{children:"v2.0.0"}),", the interpreter has an optimizer that can cache the execution plan of the logic if re-used, improving interpreted performance without the need for compilation."]}),"\n",(0,t.jsxs)(n.p,{children:["Running many iterations of ",(0,t.jsx)(n.code,{children:"json-logic-js"}),"'s test suite, we can observe stark performance differences between the built versions of the ",(0,t.jsx)(n.code,{children:"json-logic-engine"})," against ",(0,t.jsx)(n.code,{children:"json-logic-js"}),".  ",(0,t.jsx)("br",{})]}),"\n",(0,t.jsx)(n.pre,{children:(0,t.jsx)(n.code,{children:"> node test.js\njson-logic-js: 5.617s\nle interpreted: 5.287s\nle interpreted (optimized): 2.725s\nle built: 756.049ms\nle async interpreted: 4.725s\nle async built: 2.231s\n"})}),"\n",(0,t.jsx)("br",{}),"\n",(0,t.jsx)(n.p,{children:"This comparison is not fair though, as the compilation mechanism is able to evaluate whether a particular branch is deterministic & pre-compute portions of the logic in advance. Running a different test suite that can't be pre-computed yields:"}),"\n",(0,t.jsx)(n.pre,{children:(0,t.jsx)(n.code,{children:"> node test.js\njson-logic-js: 312.856ms\nle interpreted: 287.769ms\nle interpreted (optimized): 79.886ms\nle built: 15.186ms\nle async interpreted: 130.97ms\nle async built: 53.791ms\n"})}),"\n",(0,t.jsx)("br",{}),"\n",(0,t.jsx)(n.p,{children:"Additionally, the compilation mechanism allows the asynchronous version of the engine to perform quite well against its interpreted counter-part."}),"\n",(0,t.jsx)(n.pre,{children:(0,t.jsx)(n.code,{children:"> node perf.js & node perf2.js\ninterpreted: 8.765s\ninterpreted (optimized): 796.726ms\nbuilt: 130.512ms\n"})}),"\n",(0,t.jsx)(n.hr,{}),"\n",(0,t.jsxs)(n.p,{children:["Comparing the engine against an alternative library like ",(0,t.jsx)(n.code,{children:"json-rules-engine"}),","]}),"\n",(0,t.jsx)(n.pre,{children:(0,t.jsx)(n.code,{className:"language-js",children:"{\n  any: [{\n    all: [{\n      fact: 'gameDuration',\n      operator: 'equal',\n      value: 40\n    }, {\n      fact: 'personalFoulCount',\n      operator: 'greaterThanInclusive',\n      value: 5\n    }]\n  }, {\n    all: [{\n      fact: 'gameDuration',\n      operator: 'equal',\n      value: 48\n    }, {\n      fact: 'personalFoulCount',\n      operator: 'greaterThanInclusive',\n      value: 6\n    }]\n  }]\n}\n"})}),"\n",(0,t.jsx)(n.p,{children:"vs"}),"\n",(0,t.jsx)(n.pre,{children:(0,t.jsx)(n.code,{className:"language-js",children:"{\n  or: [\n    {\n      and: [{\n        '===': [40, { var: 'gameDuration' }]\n      }, {\n        '>=': [{ var: 'personalFoulCount' }, 5]\n      }]\n    },\n    {\n      and: [{\n        '===': [48, { var: 'gameDuration' }]\n      }, {\n        '>=': [{ var: 'personalFoulCount' }, 6]\n      }]\n    }\n  ]\n}\n"})}),"\n",(0,t.jsx)(n.p,{children:"The performance difference is significant:"}),"\n",(0,t.jsx)(n.pre,{children:(0,t.jsx)(n.code,{children:"> node rules.js\njson-logic-engine: 54.421ms\njson-rules-engine: 9.153s\n"})}),"\n",(0,t.jsx)(n.hr,{}),"\n",(0,t.jsx)(n.p,{children:"To use this feature, you merely have to call:"}),"\n",(0,t.jsx)(n.pre,{children:(0,t.jsx)(n.code,{className:"language-js",children:"const func = engine.build(logic)\n"})}),"\n",(0,t.jsxs)(n.p,{children:["And invoke ",(0,t.jsx)(n.code,{children:"func"})," with the data you'd like to run it with."]})]})}function p(e={}){const{wrapper:n}={...(0,r.R)(),...e.components};return n?(0,t.jsx)(n,{...e,children:(0,t.jsx)(d,{...e})}):d(e)}}}]);