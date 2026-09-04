// Daily C++ Interview Q043: What are explicit constructors and what are their advantages?
// Key: An `explicit` constructor or conversion function cannot be used for unwanted implicit
// conversion in copy initialization or argument passing. Direct initialization remains
// available, so the call site must state the conversion intentionally.
struct Meter {
    explicit Meter(double value) : value(value) {}
    double value;
};

void use(Meter) {}

int main() {
    use(Meter{2.0});
#if 0
    use(2.0); // blocked by explicit
#endif
}
