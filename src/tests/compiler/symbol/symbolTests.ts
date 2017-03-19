﻿import {expect} from "chai";
import * as ts from "typescript";
import {Symbol} from "./../../../compiler";
import {getInfoFromText} from "./../testHelpers";

describe(nameof(Symbol), () => {
    const {sourceFile: enumSourceFile} = getInfoFromText("enum MyEnum {}");
    const enumDeclaration = enumSourceFile.getEnumDeclarations()[0];
    const enumNameNodeSymbol = enumDeclaration.getNameNode().getSymbol()!;

    describe(nameof<Symbol>(s => s.getName), () => {
        it("should get the symbol name", () => {
            expect(enumNameNodeSymbol.getName()).to.equal("MyEnum");
        });
    });

    describe(nameof<Symbol>(s => s.getDeclarations), () => {
        it("should get the symbol declarations", () => {
            const result = enumNameNodeSymbol.getDeclarations();
            expect(result.length).to.equal(1);
            expect(result[0]).to.equal(enumDeclaration);
        });
    });

    describe(nameof<Symbol>(s => s.getFlags), () => {
        it("should get the symbol flags", () => {
            expect(enumNameNodeSymbol.getFlags()).to.equal(ts.SymbolFlags.RegularEnum);
        });
    });
});