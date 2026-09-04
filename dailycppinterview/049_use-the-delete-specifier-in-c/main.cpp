// Real-World C++ Interviews Q049: How to use the = delete specifier in C++?
// Key: Writing `= delete` declares a function but forbids every use selected by overload
// resolution. Besides special members, deleted overloads can block unsafe conversions and
// produce clear diagnostics.
void seats(int) {}
void seats(double) = delete;

int main() {
    seats(5);
#if 0
    seats(5.5); // error: use of deleted function
#endif
}
