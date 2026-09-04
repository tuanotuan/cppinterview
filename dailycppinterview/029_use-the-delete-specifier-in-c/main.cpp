// Daily C++ Interview Q029: How to use the = delete specifier in C++?
// Key: Writing `= delete` declares a function but makes every selected use ill-formed. It is
// useful for disabling copying, dangerous overloads, or implicit conversions while still
// letting overload resolution produce a precise diagnostic.
void seats(int) {}
void seats(double) = delete;

int main() {
    seats(5);
#if 0
    seats(5.5); // error: use of deleted function
#endif
}
