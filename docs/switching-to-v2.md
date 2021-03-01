# Switching to V2
## Java distribution
The major breaking change in V2 is the new mandatory input `distribution`. This field should be specified with one of supported distributions. See [Supported distributions](../README.md#Supported-distributions) section for the list of available options.  
Use `zulu` keyword if you would like to continue using the same distributor as in the V1.

**General recommendation** — configure CI with the same distribution that is used on your local dev machine.


TO-DO: Will we drop 1.8, 1.7 syntax?
TO-DO: Will we stop creating settings.xml for default fields?
TO-DO: Will we stop installing Java if distributor and java-version are not specified?
TO-DO: Should we say something about new approach of searching Java versions via Azul API instead of parsing HTML page?
