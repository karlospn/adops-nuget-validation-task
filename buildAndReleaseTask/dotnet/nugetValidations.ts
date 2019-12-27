import tl = require('azure-pipelines-task-lib/task');
import { Base64 } from 'js-base64';
import { nuget } from '../common/interfaces'
const request = require('request-promise-native');
import {Whitelist, validation, result, nugetCandidates} from '../common/interfaces'


export class nugetValidations {

    
    async Validate(data: any, branch: any, usePrereleaseNugets: any) : Promise<result> {
        
        var result: result = { validations : [] };
        tl.debug(`Begin dotnet validations`)
        
        if(data != undefined)
        {
            result.validations.push( ...this.ValidateSameVersionsOnAllProjects(data));
            result.validations.push( ...this.ValidatePreReleaseNugets(data, branch, usePrereleaseNugets ));
            result.validations.push( ...await this.ValidateWhiteList(data));    
        }
        return result;
    }

    private ValidateSameVersionsOnAllProjects(nugets: any[]) : validation[]
    {

        tl.debug(`Validating nuget versions`)

        var result: result = { validations: [] };

        var faulty_nugets : nuget[] = [];
        nugets.forEach(outer => {
            nugets.forEach(inner => {
                if (outer.name.toLowerCase() === inner.name.toLowerCase() && 
                    outer.version != inner.version)
                { 
                    var found = false;
                    faulty_nugets.forEach(f => {
                        if(f.name == inner.name)
                        {
                            found = true;
                            if(!f.version.some( y => y == inner.version ))
                            {
                                f.version.push(inner.version);
                            }
                        }
                    });

                    if(found === false)
                    {
                        faulty_nugets.push({
                            name: inner.name, 
                            version: [inner.version, outer.version]
                        });
                    }
                }
            });        
        });

        if(faulty_nugets.length > 0)
        {
            faulty_nugets.forEach(f => {
                result.validations.push({
                    isOk: false, 
                    message: `ERROR: Found nuget ${f.name} with versions ${f.version}`});
            });          
        }
        return result.validations;
    }

    private ValidatePreReleaseNugets(nugets: any[], branch: string, usePrereleaseNugets: boolean) : validation[]
    {

        tl.debug(`Validating pre-release nugets`)
        tl.debug(`Skip prerelease nugets: ${usePrereleaseNugets}`)
        
        var result: result = { validations: [] };

        if(usePrereleaseNugets)
            return result.validations;

        nugets.forEach(nuget => {
            let regexp = new RegExp('^([0-9]{1,})\.([0-9]{1,})(\.([0-9]{1,}))?(\.([0-9]{1,}))?$');
            var valid = regexp.test(nuget.version)
            if(!valid)
                result.validations.push({
                    isOk: false, 
                    message: `ERROR: Found nuget ${nuget.name} that contains pre-release version: ${nuget.version}`});            
        });

    }

    private async ValidateWhiteList(nugets: any[]): Promise<validation[]>
    {
        tl.debug(`Validating Whitelist`)

        var whitelist : Whitelist = await this.GetWhitelistAsync();

        tl.debug(`Whitelist found. Printing content: ${JSON.stringify(whitelist)}`)
        
        if(whitelist.nugets == null || whitelist.nugets.length == 0)
            throw  new Error("Empty or malformed manifest");


        var result: result = { validations: [] };
    
        for(var k = 0; k < nugets.length; k++)
        {

            var candidates_list : nugetCandidates[] = [];
            var tokenize_nuget = nugets[k].name.toLowerCase().split(".");

            whitelist.nugets.forEach(whitelisted => 
            { 
                var miss = false;
                var tokenize_whitelist = whitelisted.name.toLowerCase().split(".");

                if(tokenize_whitelist.length == 0)
                    throw new Error(`ERROR: Malformed whitelist. Cannot tokenize ${whitelisted.name} `);

                if(tokenize_whitelist[0] === "*")
                    throw new Error(`ERROR: Malformed whitelist. The whitelist contains a wildcard at root level `);    
  
                for(var i = 0; i< tokenize_nuget.length; i++)
                {
                    if(tokenize_whitelist[i] != tokenize_nuget[i] && tokenize_whitelist[i] != "*")
                    {
                        miss = true;
                        break;
                    }
                                       
                    if(tokenize_whitelist[i] === "*")
                        break; 
                }

                if(!miss)
                {
                    var sum = 0;
                    tokenize_whitelist.forEach(element => { if(element != "*") sum = sum + 1; });
                    candidates_list.push({name: whitelisted.name, version: whitelisted.version, scoring: sum })
                }

            });

            if(candidates_list.length == 0)
            {
                result.validations.push({isOk: false, message: `ERROR: Found nuget ${nugets[k].name} with version ${nugets[k].version} is not in the whitelist`});
            }
            else
            {
                candidates_list.sort((a, b) => (a.scoring < b.scoring) ? 1 : -1)
                var valid_version = this.ValidateVersion(candidates_list[0].version, nugets[k]);
                if(!valid_version) 
                    result.validations.push({isOk: false, message: `ERROR: Found nuget ${nugets[k].name} with version ${nugets[k].version} is not in the whitelist`});
            }
        }
        return result.validations;
    }


    private ValidateVersion(whitelisted_versions: string[], nuget: any)
    {
        if(whitelisted_versions === undefined)
            return true;

        if(whitelisted_versions.length == 0)
            throw new Error(`ERROR: Malformed whitelist. ${nuget.name} contains and empty versions array`)

        else
        {
            var tokenize_version = nuget.version.split(".")

            for(var i = 0; i < whitelisted_versions.length; i++ )
            {                
                var miss = false;
                var tokenize_whitelist_version = whitelisted_versions[i].split(".");
                for(var j = 0; j < tokenize_version.length; j ++)
                {
                    if(tokenize_version[j] != tokenize_whitelist_version[j] && tokenize_whitelist_version[j] != "*")
                    {
                        miss = true;
                        break;
                    }

                    if(tokenize_whitelist_version[j] === "*")
                        return true;
                }

                if(!miss)
                {
                    return true;
                }    
            };
            return false;
        }
    }

    private getSystemAccessToken(): string {
        tl.debug('Getting credentials for local feeds');
        let auth = tl.getEndpointAuthorization('SYSTEMVSSCONNECTION', false);
        if (auth!.scheme === 'OAuth') {
            tl.debug('Got auth token');
            return auth!.parameters['AccessToken'];
        } else {
            throw new Error('ERROR: Could not determine credentials to use');
        }
    }

    private async GetWhitelistAsync() {
        
        tl.debug(`Calling Azure DevOps Api`)
        let accessToken = this.getSystemAccessToken()
        if(accessToken === "")
            throw new Error("accessTokenNotFound");
        const options = {
            //Change it for your repository
            url: 'https://dev.azure.com/carlos/Lab/_apis/git/repositories/WhitelistRepository/items?path=whitelist.json&download=true&_a=content&api-version=5.1',
            headers: {
              'Authorization': `Basic ${Base64.encode(":" + accessToken)}`
            }
        };

        return request(options).then((result:any) => {

            var whitelist: Whitelist = JSON.parse(result);
            return whitelist;

        }).catch((error:any) => {

            throw new Error(error.message);

        });
        
    }
}
