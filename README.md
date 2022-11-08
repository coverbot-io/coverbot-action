# Coverbot

Fast tool to track code coverage, get your API key at https://coverbot.io


## Usage

```yaml
jobs:
  tests:

    steps:
    # ...

    - name: Check Code Coverage
      uses: coverbot-io/coverbot-action@v1
      with:
        file: path/to/cover.json
        coverbot_api_key: ${{ secrets.COVERBOT_API_KEY}}
        github_token: ${{ secrets.GITHUB_TOKEN}}

    # ...
```

## Inputs

-   `file`: (Required) A json file containing code coverage results (currently only the excoveralls format is supported).

-   `coverbot_api_key`: (Required) You will need to create an API key on 
    https://app.coverbot.io/api-keys and save it as a secret in GitHub 
    Actions settings.

-   `github_token`: (Required) Access from `${{ secrets.GITHUB_TOKEN }}`