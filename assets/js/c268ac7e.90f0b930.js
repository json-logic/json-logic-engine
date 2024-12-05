"use strict";(self.webpackChunkjson_logic_engine_documentation=self.webpackChunkjson_logic_engine_documentation||[]).push([[714],{8295:(e,t,r)=>{r.r(t),r.d(t,{assets:()=>l,contentTitle:()=>d,default:()=>u,frontMatter:()=>o,metadata:()=>a,toc:()=>c});const a=JSON.parse('{"id":"higher","title":"Higher Order Operators","description":"Higher order operations are significantly more complex than the other types of operations, because they allow you to apply a piece of logic iteratively.","source":"@site/docs/iteration.mdx","sourceDirName":".","slug":"/higher","permalink":"/json-logic-engine/docs/higher","draft":false,"unlisted":false,"editUrl":"https://github.com/TotalTechGeek/json-logic-engine-documentation/edit/master/website/docs/iteration.mdx","tags":[],"version":"current","frontMatter":{"id":"higher","title":"Higher Order Operators"},"sidebar":"someSidebar","previous":{"title":"Context Operators","permalink":"/json-logic-engine/docs/context"}}');var i=r(4848),n=r(8453),s=r(9126);const o={id:"higher",title:"Higher Order Operators"},d=void 0,l={},c=[{value:"Map",id:"map",level:2},{value:"Reduce",id:"reduce",level:2},{value:"Filter",id:"filter",level:2}];function h(e){const t={code:"code",h1:"h1",h2:"h2",p:"p",table:"table",tbody:"tbody",td:"td",th:"th",thead:"thead",tr:"tr",...(0,n.R)(),...e.components};return(0,i.jsxs)(i.Fragment,{children:[(0,i.jsxs)(t.p,{children:["Higher order operations are significantly more complex than the other types of operations, because they allow you to apply a piece of logic iteratively. ",(0,i.jsx)("br",{}),(0,i.jsx)("br",{})]}),"\n",(0,i.jsxs)(t.table,{children:[(0,i.jsx)(t.thead,{children:(0,i.jsxs)(t.tr,{children:[(0,i.jsx)(t.th,{children:"Operators"}),(0,i.jsx)(t.th,{children:"Instruction"})]})}),(0,i.jsxs)(t.tbody,{children:[(0,i.jsxs)(t.tr,{children:[(0,i.jsx)(t.td,{children:"Map"}),(0,i.jsx)(t.td,{children:"map"})]}),(0,i.jsxs)(t.tr,{children:[(0,i.jsx)(t.td,{children:"Reduce"}),(0,i.jsx)(t.td,{children:"reduce"})]}),(0,i.jsxs)(t.tr,{children:[(0,i.jsx)(t.td,{children:"Filter"}),(0,i.jsx)(t.td,{children:"Filter"})]}),(0,i.jsxs)(t.tr,{children:[(0,i.jsx)(t.td,{children:"Every"}),(0,i.jsx)(t.td,{children:"every, all"})]}),(0,i.jsxs)(t.tr,{children:[(0,i.jsx)(t.td,{children:"Some"}),(0,i.jsx)(t.td,{children:"some"})]}),(0,i.jsxs)(t.tr,{children:[(0,i.jsx)(t.td,{children:"None"}),(0,i.jsx)(t.td,{children:"none"})]}),(0,i.jsxs)(t.tr,{children:[(0,i.jsx)(t.td,{children:"Each Object Key"}),(0,i.jsx)(t.td,{children:"eachKey"})]})]})]}),"\n",(0,i.jsx)(t.p,{children:"Additionally, it is important to note that this module supports handlebars style traversal of data within these control structures."}),"\n",(0,i.jsx)(t.h2,{id:"map",children:"Map"}),"\n",(0,i.jsx)(s.A,{defaultLogic:{map:[{var:""},{"+":[{var:""},1]}]},defaultData:[1,2,3]}),"\n",(0,i.jsx)(t.p,{children:"The first operand defines the array you are operating on, while the second defines the operation you are performing. The context switches such that the local variable is the value from the array."}),"\n",(0,i.jsx)("br",{}),"\n",(0,i.jsxs)(t.p,{children:["This following example shows the Handlebars style traversal - ",(0,i.jsx)("br",{})]}),"\n",(0,i.jsx)(s.A,{defaultLogic:{map:[{var:"arr"},{"+":[{var:"../../a"},{var:""}]}]},defaultData:{arr:[1,2,3],a:2}}),"\n",(0,i.jsx)(t.h2,{id:"reduce",children:"Reduce"}),"\n",(0,i.jsx)(s.A,{defaultLogic:{reduce:[{var:"arr"},{"+":[{var:"accumulator"},{var:"current"}]},0]},defaultData:{arr:[1,2,3,4,5]}}),"\n",(0,i.jsx)(t.p,{children:'The first operand defines the array you are operating on, while the second defines the operation you are performing. The context switches such that the value "current" is the value from the array, and "accumulator" is the accumulated value.'}),"\n",(0,i.jsx)(t.p,{children:"The third operand can be excluded."}),"\n",(0,i.jsx)(t.h2,{id:"filter",children:"Filter"}),"\n",(0,i.jsx)(s.A,{defaultLogic:{filter:[{var:""},{"%":[{var:""},2]}]},defaultData:[1,2,3,4,5,6,7,8,9,10]}),"\n",(0,i.jsx)(t.h1,{id:"every-all",children:"Every, All"}),"\n",(0,i.jsx)(s.A,{defaultLogic:{every:[{var:""},{"%":[{var:""},2]}]},defaultData:[1,3,5,7,9]}),"\n",(0,i.jsx)(t.h1,{id:"some",children:"Some"}),"\n",(0,i.jsx)(s.A,{defaultLogic:{some:[{var:""},{"%":[{var:""},2]}]},defaultData:[2,3,5,7,9]}),"\n",(0,i.jsx)(t.h1,{id:"none",children:"None"}),"\n",(0,i.jsx)(s.A,{defaultLogic:{none:[{var:""},{"%":[{var:""},2]}]},defaultData:[2,4,6,8]}),"\n",(0,i.jsx)(t.h1,{id:"each-key",children:"Each Key"}),"\n",(0,i.jsxs)(t.p,{children:["Sometimes you may wish to iterate over an object instead of an array, executing the logic on each value in the object. ",(0,i.jsx)(t.code,{children:"json-logic-engine"})," has a built in operator for this:"]}),"\n",(0,i.jsx)(s.A,{defaultLogic:{eachKey:{a:{var:"x"},b:{"+":[{var:"y"},1]}}},defaultData:{x:1,y:2}})]})}function u(e={}){const{wrapper:t}={...(0,n.R)(),...e.components};return t?(0,i.jsx)(t,{...e,children:(0,i.jsx)(h,{...e})}):h(e)}}}]);