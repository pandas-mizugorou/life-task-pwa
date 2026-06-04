// GraphQL query/mutation strings for GitHub Projects v2 (GraphQL-only) plus the
// issue reads we layer on top. Issue writes (create/edit/close/comment) use REST.

/** Read the board: every item's id (needed for status mutations) + its issue + Status. */
export const BOARD_QUERY = /* GraphQL */ `
query Board($project: ID!, $cursor: String) {
  node(id: $project) {
    ... on ProjectV2 {
      items(first: 100, after: $cursor) {
        pageInfo { hasNextPage endCursor }
        nodes {
          id
          content {
            ... on Issue {
              number
              title
              state
              url
              updatedAt
              labels(first: 10) { nodes { name color } }
              comments { totalCount }
            }
          }
          fieldValueByName(name: "Status") {
            ... on ProjectV2ItemFieldSingleSelectValue { name optionId }
          }
        }
      }
    }
  }
}`

/** Fetch one issue + its project item (for status resolution / post-write refresh). */
export const ONE_ISSUE_QUERY = /* GraphQL */ `
query OneIssue($owner: String!, $repo: String!, $number: Int!) {
  repository(owner: $owner, name: $repo) {
    issue(number: $number) {
      id number title body state url updatedAt
      labels(first: 10) { nodes { name color } }
      comments { totalCount }
      projectItems(first: 20) {
        nodes {
          id
          project { id }
          fieldValueByName(name: "Status") {
            ... on ProjectV2ItemFieldSingleSelectValue { name optionId }
          }
        }
      }
    }
  }
}`

/** Issue detail including comment bodies. */
export const TASK_DETAIL_QUERY = /* GraphQL */ `
query TaskDetail($owner: String!, $repo: String!, $number: Int!) {
  repository(owner: $owner, name: $repo) {
    issue(number: $number) {
      id number title body state url updatedAt
      labels(first: 10) { nodes { name color } }
      comments(first: 100) {
        totalCount
        nodes { id author { login } body createdAt }
      }
      projectItems(first: 20) {
        nodes {
          id
          project { id }
          fieldValueByName(name: "Status") {
            ... on ProjectV2ItemFieldSingleSelectValue { name optionId }
          }
        }
      }
    }
  }
}`

/** Live Status field + options (for /api/meta sanity check + passphrase probe). */
export const META_QUERY = /* GraphQL */ `
query Meta($project: ID!) {
  node(id: $project) {
    ... on ProjectV2 {
      id
      field(name: "Status") {
        ... on ProjectV2SingleSelectField { id name options { id name } }
      }
    }
  }
}`

export const ADD_ITEM_MUTATION = /* GraphQL */ `
mutation AddItem($project: ID!, $content: ID!) {
  addProjectV2ItemById(input: { projectId: $project, contentId: $content }) {
    item { id }
  }
}`

export const SET_STATUS_MUTATION = /* GraphQL */ `
mutation SetStatus($project: ID!, $item: ID!, $field: ID!, $opt: String!) {
  updateProjectV2ItemFieldValue(input: {
    projectId: $project, itemId: $item, fieldId: $field,
    value: { singleSelectOptionId: $opt }
  }) { projectV2Item { id } }
}`

export const DELETE_ITEM_MUTATION = /* GraphQL */ `
mutation DeleteItem($project: ID!, $item: ID!) {
  deleteProjectV2Item(input: { projectId: $project, itemId: $item }) { deletedItemId }
}`

/** Move an item to just after `after` (null/omitted = top of the project order). */
export const MOVE_ITEM_MUTATION = /* GraphQL */ `
mutation MoveItem($project: ID!, $item: ID!, $after: ID) {
  updateProjectV2ItemPosition(input: { projectId: $project, itemId: $item, afterId: $after }) {
    clientMutationId
  }
}`
