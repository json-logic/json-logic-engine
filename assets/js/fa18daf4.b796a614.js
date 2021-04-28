(window.webpackJsonp=window.webpackJsonp||[]).push([[18],{64:function(e,t,n){"use strict";n.r(t),n.d(t,"frontMatter",(function(){return r})),n.d(t,"metadata",(function(){return l})),n.d(t,"toc",(function(){return s})),n.d(t,"default",(function(){return b}));var a=n(3),i=n(7),o=(n(0),n(68)),r={id:"methods",title:"Adding Methods"},l={unversionedId:"methods",id:"methods",isDocsHomePage:!1,title:"Adding Methods",description:"Adding Methods",source:"@site/docs/methods.md",sourceDirName:".",slug:"/methods",permalink:"/json-logic-engine/docs/methods",editUrl:"https://github.com/TotalTechGeek/json-logic-engine-documentation/edit/master/website/docs/methods.md",version:"current",frontMatter:{id:"methods",title:"Adding Methods"},sidebar:"someSidebar",previous:{title:"Installation and Setup",permalink:"/json-logic-engine/docs/"},next:{title:"Asynchronous Engine",permalink:"/json-logic-engine/docs/async"}},s=[{value:"Adding Methods",id:"adding-methods",children:[]}],c={toc:s};function b(e){var t=e.components,n=Object(i.a)(e,["components"]);return Object(o.b)("wrapper",Object(a.a)({},c,n,{components:t,mdxType:"MDXLayout"}),Object(o.b)("h2",{id:"adding-methods"},"Adding Methods"),Object(o.b)("p",null,"While the default methods support a lot of common functionality, to make the logic engine useful within your domain & give it the ability to interact with your platform, the module has tried to make it simple to add new commands into the framework."),Object(o.b)("br",null),Object(o.b)("pre",null,Object(o.b)("code",{parentName:"pre",className:"language-js"},"const engine = new LogicEngine()\n\nengine.addMethod('hello', name => {\n    return `Hello, ${name}!`\n})\n\nconst f = engine.build({ 'hello': {var: ''} })\n\nconsole.log(f('json-logic-engine')) // Hello, json-logic-engine!\n")),Object(o.b)("p",null,"Let's use a less silly example,"),Object(o.b)("br",null),Object(o.b)("pre",null,Object(o.b)("code",{parentName:"pre",className:"language-js"},"engine.addMethod('repeat', ([str, times]) => {\n    return str.repeat(times)\n})\n\nconst g = engine.build({ 'cat' : [{ 'repeat': [{var: ''}, 7] }, ' Batman'] })\n\nconsole.log(g('Na')) // NaNaNaNaNaNaNa Batman\u2008\n")),Object(o.b)("h4",{id:"additional-flexibility"},"Additional Flexibility"),Object(o.b)("p",null,"This section is only for really niche edge cases, I don't expect it to benefit most users."),Object(o.b)("br",null),Object(o.b)("p",null,"If you need more capability than executing a function, like hijacking the traversal of the input or accessing context, it is possible to do so. "),Object(o.b)("p",null,"You can disable the automatic traversal of the input by using ",Object(o.b)("inlineCode",{parentName:"p"},"traverse: false"),", this can be useful if you want to preserve the input for things like defining your own control structures."),Object(o.b)("pre",null,Object(o.b)("code",{parentName:"pre",className:"language-js"},'engine.addMethod(\'repeatObj\', {\n   traverse: false,\n   method: ([obj, times]) => {\n       return JSON.stringify(obj).repeat(times)\n   }\n})\n\nconst h = engine.build({ \'repeatObj\': [{ var: \'a\' }, 5] })\n\nconsole.log(h()) // prints "{"var":"a"}{"var":"a"}{"var":"a"}{"var":"a"}{"var":"a"}"\n')),Object(o.b)("p",null,"You can also specify an alternate ",Object(o.b)("inlineCode",{parentName:"p"},"asyncMethod")," in case for whatever reason a particular function would not function the same in an asynchronous environment (like if you're making calls to ",Object(o.b)("inlineCode",{parentName:"p"},"engine.run"),")."),Object(o.b)("br",null),Object(o.b)("p",null,"Your method can have the following signature:\n",Object(o.b)("inlineCode",{parentName:"p"},"(input, context, above, engine) => {}")),Object(o.b)("br",null),Object(o.b)("table",null,Object(o.b)("thead",{parentName:"table"},Object(o.b)("tr",{parentName:"thead"},Object(o.b)("th",{parentName:"tr",align:null},"Params"),Object(o.b)("th",{parentName:"tr",align:null},"Explanation"))),Object(o.b)("tbody",{parentName:"table"},Object(o.b)("tr",{parentName:"tbody"},Object(o.b)("td",{parentName:"tr",align:null},"input"),Object(o.b)("td",{parentName:"tr",align:null},"Whatever data is passed into the function. If traversal is disabled, this'll be the raw input.")),Object(o.b)("tr",{parentName:"tbody"},Object(o.b)("td",{parentName:"tr",align:null},"context"),Object(o.b)("td",{parentName:"tr",align:null},'The current "context" for the run-time. This can be either whatever the function is invoked with, or the context set by a higher order operator (map, reduce, etc.)')),Object(o.b)("tr",{parentName:"tbody"},Object(o.b)("td",{parentName:"tr",align:null},"above"),Object(o.b)("td",{parentName:"tr",align:null},"Whenever a higher order operator is invoked, it pushes the current context to an array.  This is what allows the handlebars style traversal, so you can access values from outside of the current context.")),Object(o.b)("tr",{parentName:"tbody"},Object(o.b)("td",{parentName:"tr",align:null},"engine"),Object(o.b)("td",{parentName:"tr",align:null},"The current engine powering this call, this is really useful for when you're building custom control structures and want to invoke ",Object(o.b)("inlineCode",{parentName:"td"},"engine.run")," or similar.")))),Object(o.b)("blockquote",null,Object(o.b)("p",{parentName:"blockquote"},"Be aware that if you write your function to access context, you should add ",Object(o.b)("inlineCode",{parentName:"p"},"useContext: true")," to your function object configuration. This is used by the compilation mechanism.")),Object(o.b)("hr",null),Object(o.b)("h4",{id:"assisting-the-engine"},"Assisting the Engine"),Object(o.b)("p",null,'It is possible to inform the engine of things it could use to try to optimize itself during "compilation". If your function has no side-effects, you can flag it as deterministic by passing in an additional parameter ',Object(o.b)("br",null),Object(o.b)("br",null)),Object(o.b)("pre",null,Object(o.b)("code",{parentName:"pre",className:"language-js"},"engine.addMethod('repeat', ([str, times]) => {\n    return str.repeat(times)\n}, { deterministic: true })\n")),Object(o.b)("p",null,"This will allow it to evaluate whether the input to this function is also deterministic, and pre-compute the result for the generated function."),Object(o.b)("br",null),Object(o.b)("p",null,"Alternatively, if you use the advanced object syntax for adding a function, you can make ",Object(o.b)("inlineCode",{parentName:"p"},"determistic")," a function, this is particularly useful if you've turned off automatic traversal."),Object(o.b)("br",null),Object(o.b)("p",null,"Additionally, if you are using the ",Object(o.b)("inlineCode",{parentName:"p"},"AsyncLogicEngine")," class, if a particular function is fully synchronous, you may pass in ",Object(o.b)("inlineCode",{parentName:"p"},"sync: true")," as an annotation well."),Object(o.b)("pre",null,Object(o.b)("code",{parentName:"pre",className:"language-js"},"engine.addMethod('repeat', ([str, times]) => {\n    return str.repeat(times)\n}, { deterministic: true, sync: true })\n")),Object(o.b)("p",null,"This will allow the engine to more efficiently compose your custom functions together for optimal-performance."))}b.isMDXComponent=!0}}]);