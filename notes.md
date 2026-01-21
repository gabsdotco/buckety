1.  Exported variables by a script won't be able to be re-used by other scripts, only if the variable is being used inside of the same script or within a YAML scalar

    Won't work:

        ```bash
         - export FOO="bar"
         - echo $FOO
        ```

    Will work:

        ```bash
         |-
             export FOO="bar"
             echo $FOO
        ```

        or

        ```bash
         - export FOO="bar" && echo $FOO
        ```

---
