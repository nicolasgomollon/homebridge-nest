# homebridge-nest

Nest plugin for [HomeBridge](https://github.com/nfarina/homebridge)

# Disclaimer

This is a lightly modified fork for my personal use, all credit goes to [KraigM](https://github.com/KraigM/homebridge-nest).

# Installation

1. Install homebridge using: npm install -g homebridge
2. Install this plugin using: npm install -g homebridge-nest-schmittx
3. Update your configuration file. See sample-config.json snippet below.

# Initial Setup

1. Go to [https://developer.nest.com](https://developer.nest.com)
2. Choose **Sign In**
3. Use your normal account to sign in
4. Fill in your info in 'Step 1'
5. In 'Step 2' set:
	* **Company Name**: _Homebridge-Nest_
	* **Company URL**: _https://github.com/schmittx/homebridge-nest_
	* **Country**: _[Your Country]_
	* **Size of Company**: _Individual_
6. Then just agree to the terms and submit
7. Go to **Products** and create a new product
8. Fill in:
	* **Product Name**: _Homebridge_ + your name (must be unique)
	* **Description**: _Open source project to provide HomeKit integration_
	* **Categories**: _Home Automation_
	* **Users**: _Individual_
	* **Support URL**: _https://github.com/schmittx/homebridge-nest_
	* **Redirect URL**:  _[LEAVE BLANK]_
	* **Permissions (minimum)**: 
		* Enable **Away** with **read/write v2**
		* Enable **Camera** with **read/write v3**
		* Enable **Smoke+CO Alarm** with **read v5**
		* Enable **Structure** with **read/write v1**
		* Enable **Thermostat** with **read/write v6**
		* Permission description: fill in anything
9. Now you should have a product. Now locate the id/secret section on the right of your product's page
10. Copy the **Product ID** to your HomeBridge config as the **clientId** in the Nest config
11. Copy the **Product Secret** to your HomeBridge config as the **clientSecret** in the Nest config
12. Navigate to the **Authorization URL**
13. Accept the terms and copy the **Pin Code** to your HomeBridge config as the **code** in the Nest config
14. Run HomeBridge once _(do not include the **token** in the config at this time)_ and you should find a log that says something like _"CODE IS ONLY VALID ONCE! Update config to use {'token':'c.5ABsTpo88k5yfNIxZlh...'} instead."_  Copy the **_c.5ABsTpo88k5yfNIxZlh..._** portion to your HomeBridge config as the **token** in the Nest config
15. You should be able to **restart HomeBridge** and it should succeed with the new token.

After that you will be **FINALLY** done. If the token is working correctly, you no longer NEED the other three configs (clientId, clientSecret, and code) nor the original username and password from the legacy system (but you can keep them around if you wish, they will be ignored).




# Configuration

Configuration sample:

```
"platforms": [
  {
    "platform": "Nest",
    "clientId": "Developer product ID",
    "clientSecret": "Developer product secret",
    "code": "Pin code generated from Nest",
    "token": "Token will be generated upon first run of Homebridge without a token"
  }
]
```
