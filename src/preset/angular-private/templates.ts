export const mainTemplate = `{{> header}}

{{#each commitGroups}}

{{#if title}}
### {{title}}

{{/if}}
{{#each commits}}
{{> commit root=@root}}
{{/each}}

{{/each}}
{{> footer}}
`

export const headerPartial = `{{#if isPatch~}}
  ##
{{~else~}}
  #
{{~/if}} 
{{~version}}
{{~#if title}} "{{title}}"
{{~/if}}
{{~#if date}} ({{date}})
{{/if}}
`

export const commitPartial = `*{{#if scope}} **{{scope}}:**
{{~/if}} {{#if subject}}
  {{~subject}}
{{~else}}
  {{~header}}
{{~/if}}

`

export const footerPartial = `{{#if noteGroups}}
{{#each noteGroups}}

### {{title}}

{{#each notes}}
* {{#if commit.scope}}**{{commit.scope}}:** {{/if}}{{text}}
{{/each}}
{{/each}}

{{/if}}
`
