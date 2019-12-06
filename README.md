# adops-nuget-validation-task

This repository contains an azure devops custom pipelines task.
It was done following these guidelines:
- https://docs.microsoft.com/en-us/azure/devops/extend/develop/add-build-task?view=azure-devops

These task do the following actions:

- **Validates your solution is using the same nuget versions in all the projects.**

For example: 
Let's say you have a solution with 2 projects. XXX.WebApi and XXX.Business
- XXX.WebApi has installed Autofac 4.9.4
- XXX.Business has installed 4.9.0
The task throws an error telling you that there are not matching versions in you solution


- **Validates your solution is not using prerelease nuget version.**

For example:
Let's say you have a solution with 1 project: XXX.WebApi
- XXX.WebApi uses Serilog 2.9.1-dev-01154
The task throws an error. That validation can be overriden with an input.
If you check the allowPreReleaseNugets flag these validation is not going to be checked


- **Validates that your solution is not using any not whitelisted nuget.**

- These validations obtains a whitelist from an Azure Devops repository and validates that your solution is using only whitelisted nugets.
- The Azure Devops repository from which the task obtains the whitelist is hardcoded inside the task.

- The whitelist has these format:

```json
{
    "nugets": [
        {
          "name": "Microsoft.*"
        },
        {
          "name": "Microsoft.NetCore.App",
          "versions" : ["2.2.8"]
        },
        {
          "name": "Serilog.*",
          "versions" : ["2.9.*", "2.8.0"]
        }
    ]
}

```

These whitelist is telling the following information:
Allow the following nugets to be whitelisted:
- All nuget that starts with "Microsoft.*" and all the versions
  - But if the nuget is "Microsoft.NetCore.App" allow only to use version 2.2.0
- All nugets that start with Serilog.* allow to use versions 2.8.x and 2.9.x




