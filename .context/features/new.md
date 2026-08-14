For the finish the Functional Application these steps will ensure that CheckinBliss engine work correctly from beginning to end and will be ready for public launch.



1. Customer account system

these systems should work

Registration
Create account
Email validation
Password creation
Duplicate email handling
Invalid input handling
Login
Login/logout
Incorrect password handling
Session management
Password reset
Session expiry
Customer profile
Name
Email
Phone
Booking history
Account information

a customer should be able to register, verify, logic, search, book, view booking, logout, login again, still see booking.


2. Apartment/property search

The complete search system needs to work.

Customer should be able to search by:

Destination
Location
Dates
Guests
Rooms

Results should correctly display:

Property
Location
Room
Price
Availability
Images
Relevant property information

Loading states and "no results" states should also work.


3. THE 14-DAY AVAILABILITY SYSTEM

This is a highest-priority item.

kindly document the rule clearly in the code and system documentation.

Core rule

For example, if today is:

1 August

Then:

Requested stay Result
2 August No availability
5 August No availability
10 August No availability
14 August No availability
15 August+ Availability can be returned

The exact boundary — whether "14 days" means <14 or <=14 — needs to be explicitly defined in the application so there is no ambiguity.

This is critical because It is core to our business model.

The system must make sure:

Search → Availability API → Room selection → Checkout → Booking creation

all respect the same rule.

It shouldn't be possible for:

Search says "not available"

but then somebody manipulates the API and books the room anyway.

Kindly test:
1 day
3 days
7 days
13 days
14 days
15 days
30 days
60 days
boundary dates
timezone differences

And the rule must be enforced server-side, not just in the frontend.


4. Apartment/property pages

Every property page should work properly.

It needs:

Property images
Property description
Location
Amenities
Room types
Pricing
Availability
Booking CTA
Nearby information
Relevant verification information
Policies
Cancellation information

Kindly make sure the underlying data works.


5. Room selection

A customer should be able to:

Property - Room - Dates - Guests - Book

The system must correctly calculate:

Room price
Number of guests
Number of nights
Total
Applicable fees
Any charges

No hard-coded prices should be driving the booking.


6. Booking engine

Also very important
these must implement:

Booking creation

A booking should have a unique ID/reference.

It should record:

Customer
Property
Room
Dates
Guests
Amount
Currency
Payment status
Booking status
Timestamp
Booking states

For example:

Pending

-Payment initiated

-Paid

-Confirmed

or:

Pending

-Payment failed

-Failed/Cancelled

this will make it clean


7. PAYMENT SYSTEM

This deserves special attention because we will be handling real customer money.

Will need to demonstrate:

Successful payment

Customer:

Book - Pay - Payment succeeds - Booking confirmed

Failed payment

Book - Pay - Payment fails - Booking NOT confirmed

Cancelled payment

Book - Pay - Customer cancels - Booking NOT confirmed

Duplicate payment

Customer accidentally clicks:

PAY - PAY

twice.

The system must not create two bookings.



8. THE MOST IMPORTANT FAILURE SCENARIO

we will need to explicitly test:

Payment succeeds but booking creation fails.

Example:

Customer pays:

£200

Stripe says:

SUCCESS

But then:

Database/API error

What happens?

The system must have a defined reconciliation mechanism.

Kindly detail:

"If payment succeeds but the booking API fails, how do we know that the customer paid and recover/create/reconcile the booking?"

This needs to be documented.


9. Booking inventory protection

we don't want a scenario where:

Customer A:

Palms crib - 10–15 August - booking

Customer B:

Palms crib - 10–15 August - booking

Both getting confirmed.

Even more importantly, the system needs to prevent race conditions where two people attempt to book the same room simultaneously.

we will need to test:

Two customers - same property - same room - same dates - simultaneous booking.

Only the permitted booking should succeed.


10. WhatsApp Property Owner System

this is also a critical system, and thanks for the screenshot you showed me

This is the backbone of our operation.

and a key and major property inventory management system.

A property owner should be able to perform agreed actions

we will need to create a property owner account to stress test this feature which will be a show or demo for new property owners


11. WhatsApp security

This is extremely important.

we cannot simply allow:

Anyone who knows the WhatsApp number - modify hotel inventory.

The system needs to establish:

WhatsApp number - authenticated property owner - authorised property/properties

And the bot should know exactly what that owner is allowed to change.

For example:

Owner A:

Property A

Owner B:

Property B

Owner A must not be able to say:

"Block all rooms at Property B."



12. WhatsApp - database - website

Test the complete chain:

Property owner

WhatsApp

WhatsApp bot

Backend

Database

Availability engine

Customer website

If the owner blocks a room through WhatsApp, the customer should no longer be able to book that room where the business rules say it should be unavailable.

And the reverse should work where appropriate.

This is a critical integration test.


13. Admin dashboard, Operator dashboard (Lagos and abuja and to create a new operator dashboard) then property owner dashboard ( just for their internal calendar sync minimal interaction WhatsApp is the major way. )

finish all the dashboard.


14. Notifications

Test:

Customer

Booking:

Confirmed - confirmation email/WhatsApp/SMS

Payment:

Successful - receipt/confirmation

Cancellation:

Cancelled - notification

Property owner

New booking:

Owner notified

Cancellation:

Owner notified

Inventory change:

Owner notified where applicable
