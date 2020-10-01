/*
CHECK DIGIT ALGORITHIM
The approved NUBAN format ABC-DEFGHIJKL-M where ABC is the 
3-digit bank code assigned  by the CBN, DEFGHIJKL is the 
NUBAN account serial number, M is the NUBAN check digit 
required for account number validation

- Calculate A*3 + B*7 + C*3 + D*3 + E*7 + F*3 + G*3 + H*7 +
    I*3 + J*3 + K*7 + L*3
-  Calculate Modulp 10 of your result i.e the remainder after dividing by 10
- Subtract your result from 10 to get the check digit
- If your result is 10 , then use 0 as your check digit

*/
generate_nuban = async (serial_no,code) => {
    var snc = `${code}${serial_no}`;
    var [A,B,C,D,E,F,G,H,I,J,K,L] = snc;
    var final = (A*3) + (B*7) + (C*3) + (D*3) + (E*7) + (F*3) + (G*3 )+ (H*7) + (I*3) + (J*3) + (K*7) + (L*3);
    var mod = final % 10;
    final = 10 - mod;
    (final == 10) ? final = 0 : final;
    return `${serial_no}${final}`;
}
generate_nuban_starting_from = async (serial_no_start, direction,steps,bank_code,cb)=>{
    var generated_nuban = [];
    for(var i=0;i<steps;i++){
        var serial_no;
        direction == "up" ? serial_no = Number(serial_no_start) + i : serial_no = serial_no_start - i;
        var gen = await generate_nuban(serial_no,bank_code);
        cb ? cb(gen) : generated_nuban.push(gen);
    }
    return generated_nuban;
}


exports.generate_nuban = generate_nuban;
exports.generate_nuban_starting_from = generate_nuban_starting_from;